// Cổng action trung tính (TIP-003b §4.3–4.4): dispatcher tin cậy dựng binding (event, consumer, action id cho phép, digest input tất
// định, aggregate, epoch, claim biên nhận) — không bao giờ tuần tự hoá từ HTTP / tool. Kernel KHÔNG cấp quyền hệ thống hay Owner; 003c
// nối ActionExecutor qua `run` của hợp đồng. Input khác dưới cùng biên nhận → 409; biên nhận đã xong → trả tham chiếu cũ, không chạy lại.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import { lockHead, type HeadClaim } from './dispatch-head';
import { claimReceipt, settleReceipt } from './dispatch-store';
import { safeCode, type RunResult } from './dispatch-projection';
import type { ActionContract, ActionPortBinding, DispatchedEvent } from './types';

export const inputDigest = (input: Record<string, unknown>): string => createHash('sha256').update(canonical(input)).digest('hex');

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

export class ActionInputConflictError extends Error {
  readonly code = 'EVENT_ACTION_INPUT_CONFLICT';
}

/**
 * Bước 1 (transaction ngắn): khoá head (fence) → nhận biên nhận, ghim digest. Bước 2: `run` của hợp đồng (Executor, transaction riêng
 * của action — biên nhận admission của 003c nằm trong đó). Bước 3: settle CAS. Crash giữa 2 và 3 → biên nhận `claimed` hết lease →
 * lần sau gọi lại `run` với CÙNG binding / digest; action port phải trả tham chiếu cũ (idempotent theo binding) — không chạy hiệu ứng lần hai.
 */
export async function runAction(db: Pick<TenantDb, '$transaction'>, head: HeadClaim, e: DispatchedEvent, c: ActionContract, epoch: number): Promise<RunResult> {
  const input = c.input(e);
  const digest = inputDigest(input);
  let binding: ActionPortBinding | null;
  try {
    binding = await db.$transaction(async (tx) => {
      if (!(await lockHead(tx, head))) return null;
      const [prev] = await tx.$queryRaw<{ input_digest: string | null }[]>`SELECT input_digest FROM event_consumer_receipt WHERE event_id = ${e.id}::uuid AND consumer = ${c.name} FOR UPDATE`;
      if (prev?.input_digest && prev.input_digest !== digest) throw new ActionInputConflictError();
      const claim = await claimReceipt(tx, e.id, c.name);
      if (!claim) return null;
      await tx.$executeRaw`UPDATE event_consumer_receipt SET input_digest = ${digest} WHERE event_id = ${e.id}::uuid AND consumer = ${c.name}`;
      return { eventId: e.id, consumer: c.name, actionId: c.actionId, inputDigest: digest, aggregate: { kind: e.aggregateKind, id: e.aggregateId }, epoch, claimToken: claim.token, fence: claim.fence };
    });
  } catch (err) {
    return { kind: 'failed', code: safeCode(err) };
  }
  if (!binding) return { kind: 'skipped' };
  let out;
  try {
    out = await c.run(binding, input, e);
  } catch (err) {
    out = { kind: 'failed' as const, reason: safeCode(err) };
  }
  const settled = await db.$transaction((tx) => settleReceipt(tx, e.id, c.name, { token: binding.claimToken, fence: binding.fence }, out, digest));
  if (!settled) return { kind: 'stale' };
  return out.kind === 'failed' ? { kind: 'failed', code: out.reason } : { kind: 'done', outcome: out };
}
