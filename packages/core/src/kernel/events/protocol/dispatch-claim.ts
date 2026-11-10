// Dispatch một event v2 (TIP-003b §4): nạp hàng có thẩm quyền → nhận head (chỉ seq = next_seq) → tạo biên nhận kỳ vọng theo registry
// version ĐÃ LƯU → chạy từng hợp đồng chưa xong (projection / handoff trong transaction hiệu ứng; action qua cổng) → khi MỌI biên nhận ở
// applied / no_effect / handed_off thì đánh dấu completed + tiến head trong cùng transaction CAS. Một consumer lỗi không xoá consumer đã
// xong; lỗi tạm → nhả head (event sau cùng aggregate vẫn chờ); 8 lần / unknown → chặn stream có lý do. Aggregate khác chạy song song.
import type { TenantDb } from '@appchat/db';
import { advanceHead, blockHead, claimHead, lockHead, releaseHead, type HeadClaim } from './dispatch-head';
import { MAX_DISPATCH_ATTEMPTS, dispatchAttempts, ensureReceipts, loadEvent, loadRegistry, lockReceipts, receiptDone, setDispatch } from './dispatch-store';
import { runInTransaction } from './dispatch-projection';
import { runAction } from './dispatch-action-port';
import type { EventContract, RegistryTable } from './types';

export type DispatchOutcome =
  | { kind: 'completed'; events: number }
  | { kind: 'deferred' | 'busy' | 'done' | 'missing' }
  | { kind: 'retry'; code: string }
  | { kind: 'blocked'; reason: string };

export interface DispatchV2Deps {
  db: TenantDb;
  workspaceId: string;
  /** Hợp đồng đang chạy (registry đã đóng băng) theo tên consumer. */
  contracts: ReadonlyMap<string, EventContract>;
  epoch: number;
  now: () => Date;
  registryCache?: Map<number, RegistryTable>;
}

export async function dispatchV2(d: DispatchV2Deps, eventId: string): Promise<DispatchOutcome> {
  const e = await loadEvent(d.db, d.workspaceId, eventId);
  if (!e) return { kind: 'missing' };
  const table = d.registryCache?.get(e.registryVersion) ?? (await loadRegistry(d.db, e.registryVersion));
  if (!table) return { kind: 'blocked', reason: 'registry_version_missing' };
  d.registryCache?.set(e.registryVersion, table);
  const rows = table[e.topic];
  // Topic không có dòng trong version đã lưu = không thể có (version được đóng băng từ manifest đủ topic) → chặn, không ACK câm.
  if (!rows) return { kind: 'blocked', reason: 'topic_not_in_registry' };
  const decision = await d.db.$transaction(async (tx) => {
    const h = await claimHead(tx, e);
    if (h.kind === 'claimed') {
      await ensureReceipts(tx, e.id, rows);
      await tx.$executeRaw`UPDATE event_dispatch SET phase = 'running', dispatch_token = ${h.head.token}::uuid, dispatch_generation = dispatch_generation + 1, dispatch_lease_until = now() + interval '120 seconds' WHERE event_id = ${e.id}::uuid`;
    }
    return h;
  });
  if (decision.kind === 'blocked') return { kind: 'blocked', reason: decision.reason };
  if (decision.kind !== 'claimed') return { kind: decision.kind };
  const head = decision.head;
  let events = 0;
  for (const row of [...rows].sort((a, b) => (a.consumer < b.consumer ? -1 : 1))) {
    const c = d.contracts.get(row.consumer);
    // Thiếu adapter / sai chế độ / sai version → chặn stream, KHÔNG chạy handler void cũ dưới biên nhận v2 giả.
    if (!c || c.mode !== row.mode || c.contractVersion !== row.contract_version) return block(d, head, e.id, 'missing_capability');
    const r = c.mode === 'action' ? await runAction(d.db, head, e, c, d.epoch) : await runInTransaction(d.db, head, e, c);
    if (r.kind === 'stale') return { kind: 'busy' };
    if (r.kind === 'failed') return retryOrBlock(d, head, e.id, r.code);
    if (r.kind === 'done') {
      if ('events' in r && typeof r.events === 'number') events += r.events;
      if (r.outcome.kind === 'blocked_unknown') return block(d, head, e.id, r.outcome.reason);
      if (r.outcome.kind === 'handed_off' && r.outcome.completionRequired) return wait(d, head, e.id);
    }
  }
  return complete(d, head, e.id, events);
}

async function complete(d: DispatchV2Deps, head: HeadClaim, eventId: string, events: number): Promise<DispatchOutcome> {
  return d.db.$transaction(async (tx) => {
    if (!(await lockHead(tx, head))) return { kind: 'busy' as const };
    const rs = await lockReceipts(tx, eventId);
    if (!rs.every((r) => receiptDone(r.phase))) {
      await releaseHead(tx, head);
      return { kind: 'retry' as const, code: 'receipts_incomplete' };
    }
    await setDispatch(tx, eventId, 'completed', null);
    if (!(await advanceHead(tx, head))) return { kind: 'busy' as const };
    return { kind: 'completed' as const, events };
  });
}

async function retryOrBlock(d: DispatchV2Deps, head: HeadClaim, eventId: string, code: string): Promise<DispatchOutcome> {
  return d.db.$transaction(async (tx) => {
    if (!(await lockHead(tx, head))) return { kind: 'busy' as const };
    const n = (await dispatchAttempts(tx, eventId)) + 1;
    if (n >= MAX_DISPATCH_ATTEMPTS) {
      await setDispatch(tx, eventId, 'failed', code);
      await blockHead(tx, head, `failed:${code}`);
      return { kind: 'blocked' as const, reason: `failed:${code}` };
    }
    await setDispatch(tx, eventId, 'pending', code, new Date(d.now().getTime() + 2 ** n * 1000));
    await releaseHead(tx, head);
    return { kind: 'retry' as const, code };
  });
}

async function block(d: DispatchV2Deps, head: HeadClaim, eventId: string, reason: string): Promise<DispatchOutcome> {
  return d.db.$transaction(async (tx) => {
    if (!(await lockHead(tx, head))) return { kind: 'busy' as const };
    await setDispatch(tx, eventId, 'blocked_unknown', reason);
    await blockHead(tx, head, reason);
    return { kind: 'blocked' as const, reason };
  });
}

async function wait(d: DispatchV2Deps, head: HeadClaim, eventId: string): Promise<DispatchOutcome> {
  return d.db.$transaction(async (tx) => {
    if (!(await lockHead(tx, head))) return { kind: 'busy' as const };
    await setDispatch(tx, eventId, 'waiting', 'completion_required');
    await blockHead(tx, head, 'waiting_completion');
    return { kind: 'blocked' as const, reason: 'waiting_completion' };
  });
}
