// Kho dispatch + biên nhận (TIP-003b §3.2–3.3, §4.2): nạp event v2 có thẩm quyền theo id, tạo biên nhận kỳ vọng từ registry_version
// BẤT BIẾN đã lưu (không từ registry mới nhất), CAS từng biên nhận theo (token, fence, pha). Biên nhận khoá (event_id, consumer) với
// contract_version + mode bất biến — đổi version không tạo không gian biên nhận mới để chạy lại hiệu ứng tiền.
import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../actions/action-context';
import type { ConsumerOutcome, ContractRow, DispatchedEvent, RegistryTable } from './types';

export const RECEIPT_LEASE_SEC = 120;
export const MAX_DISPATCH_ATTEMPTS = 8;
const DONE = new Set(['applied', 'no_effect', 'handed_off']);

type Db = Pick<TenantDb, '$queryRaw'>;

export async function loadEvent(db: Db, ws: string, id: string): Promise<DispatchedEvent | null> {
  const [r] = await db.$queryRaw<{ id: string; topic: string; aggregate_kind: string; aggregate_id: string; aggregate_seq: bigint; registry_version: number; payload: Record<string, unknown>; trace_id: string | null }[]>`
    SELECT o.id::text AS id, o.topic, o.aggregate_kind, o.aggregate_id::text AS aggregate_id, o.aggregate_seq, o.registry_version, o.payload, o.trace_id
      FROM outbox_event o WHERE o.id = ${id}::uuid AND o.protocol_version = 2`;
  if (!r) return null;
  if ((r.payload as { ws?: unknown }).ws !== ws) throw new Error('loadEvent: workspace không khớp');
  return { id: r.id, topic: r.topic, workspaceId: ws, aggregateKind: r.aggregate_kind, aggregateId: r.aggregate_id, aggregateSeq: BigInt(r.aggregate_seq), registryVersion: r.registry_version, payload: r.payload, traceId: r.trace_id };
}

/** Bảng hợp đồng theo version đã lưu (cache ở dispatcher). */
export async function loadRegistry(db: Db, version: number): Promise<RegistryTable | null> {
  const [r] = await db.$queryRaw<{ contracts: RegistryTable }[]>`SELECT contracts FROM event_registry_version WHERE version = ${version}`;
  return r?.contracts ?? null;
}

/** Tạo biên nhận kỳ vọng (một lần, bỏ qua nếu có) theo dòng hợp đồng của topic. */
export async function ensureReceipts(tx: TenantTx, eventId: string, rows: readonly ContractRow[]): Promise<void> {
  if (!rows.length) return;
  const sorted = [...rows].sort((a, b) => (a.consumer < b.consumer ? -1 : 1));
  await tx.$executeRaw`
    INSERT INTO event_consumer_receipt (event_id, consumer, contract_version, mode)
    SELECT ${eventId}::uuid, c, v, m::event_receipt_mode FROM unnest(${sorted.map((r) => r.consumer)}::text[], ${sorted.map((r) => r.contract_version)}::int[], ${sorted.map((r) => r.mode)}::text[]) AS t(c, v, m)
    ON CONFLICT (event_id, consumer) DO NOTHING`;
}

export interface ReceiptRow {
  consumer: string;
  phase: string;
  contract_version: number;
  mode: string;
  fence: number;
  claim_token: string | null;
  expired: boolean;
}

/** Khoá biên nhận của event theo tên consumer (thứ tự chuẩn). */
export async function lockReceipts(tx: TenantTx, eventId: string): Promise<ReceiptRow[]> {
  return tx.$queryRaw<ReceiptRow[]>`
    SELECT consumer, phase::text AS phase, contract_version, mode::text AS mode, fence, claim_token::text AS claim_token, (lease_until IS NULL OR lease_until < now()) AS expired
      FROM event_consumer_receipt WHERE event_id = ${eventId}::uuid ORDER BY consumer FOR UPDATE`;
}

export const receiptDone = (phase: string) => DONE.has(phase);

/** Nhận biên nhận để chạy hiệu ứng: pending / failed (thử lại) / claimed đã hết lease. Trả token + fence mới. */
export async function claimReceipt(tx: TenantTx, eventId: string, consumer: string): Promise<{ token: string; fence: number } | null> {
  const token = randomUUID();
  const [r] = await tx.$queryRaw<{ fence: number }[]>`
    UPDATE event_consumer_receipt SET phase = 'claimed', claim_token = ${token}::uuid, fence = fence + 1, lease_until = now() + make_interval(secs => ${RECEIPT_LEASE_SEC})
     WHERE event_id = ${eventId}::uuid AND consumer = ${consumer}
       AND (phase IN ('pending', 'failed') OR (phase = 'claimed' AND (lease_until IS NULL OR lease_until < now())))
    RETURNING fence`;
  return r ? { token, fence: r.fence } : null;
}

/** Ghi kết cục CAS (token + fence + pha claimed) — gọi trong transaction hiệu ứng (projection / handoff) hoặc ngay sau action port. */
export async function settleReceipt(tx: TenantTx, eventId: string, consumer: string, claim: { token: string; fence: number }, out: ConsumerOutcome | { kind: 'failed'; reason: string }, inputDigest?: string): Promise<boolean> {
  const ref = 'effectRef' in out ? (out.effectRef ?? null) : null;
  const reason = 'reason' in out ? out.reason.slice(0, 80) : null;
  const n = await tx.$executeRaw`
    UPDATE event_consumer_receipt SET phase = ${out.kind}::event_receipt_phase, effect_ref = ${ref}, reason = ${reason}, input_digest = COALESCE(input_digest, ${inputDigest ?? null}),
           lease_until = NULL, completed_at = CASE WHEN ${out.kind} IN ('applied', 'no_effect', 'handed_off') THEN now() ELSE NULL END
     WHERE event_id = ${eventId}::uuid AND consumer = ${consumer} AND claim_token = ${claim.token}::uuid AND fence = ${claim.fence} AND phase = 'claimed'`;
  return n === 1;
}

export async function setDispatch(tx: TenantTx, eventId: string, phase: 'completed' | 'waiting' | 'failed' | 'blocked_unknown' | 'pending', code: string | null, retryAt?: Date): Promise<void> {
  await tx.$executeRaw`
    UPDATE event_dispatch SET phase = ${phase}::event_dispatch_phase, last_error_code = ${code}, dispatch_lease_until = NULL,
           dispatch_attempts = dispatch_attempts + CASE WHEN ${phase} IN ('pending', 'failed') THEN 1 ELSE 0 END,
           available_at = COALESCE(${retryAt ?? null}::timestamptz, available_at)
     WHERE event_id = ${eventId}::uuid`;
}

export async function dispatchAttempts(tx: TenantTx, eventId: string): Promise<number> {
  const [r] = await tx.$queryRaw<{ n: number }[]>`SELECT dispatch_attempts AS n FROM event_dispatch WHERE event_id = ${eventId}::uuid FOR UPDATE`;
  return r?.n ?? 0;
}
