// Chạy một hợp đồng projection / handoff (TIP-003b §4.2–4.3): MỘT transaction tenant — khoá + kiểm head (fence) → dispatch → biên nhận
// → hiệu ứng DB → settle biên nhận CAS → commit. Tiếp quản không commit được claim mới khi transaction cũ còn giữ khoá biên nhận. Event
// mà hiệu ứng phát ra (cùng aggregate) đi qua collector của chính transaction này → flush cuối cấp seq sau hiệu ứng.
import type { TenantDb } from '@appchat/db';
import { enroll } from '../../outbox/transaction';
import { lockHead, type HeadClaim } from './dispatch-head';
import { claimReceipt, settleReceipt } from './dispatch-store';
import type { ConsumerOutcome, DispatchedEvent, HandoffContract, ProjectionContract } from './types';

export type RunResult = { kind: 'done'; outcome: ConsumerOutcome } | { kind: 'stale' } | { kind: 'failed'; code: string } | { kind: 'skipped' };

const validOutcome = (o: unknown): o is ConsumerOutcome =>
  !!o && typeof o === 'object' && ['applied', 'no_effect', 'handed_off', 'blocked_unknown'].includes((o as { kind?: string }).kind ?? '') && ((o as { kind: string }).kind !== 'handed_off' || typeof (o as { effectRef?: unknown }).effectRef === 'string');

export async function runInTransaction(db: Pick<TenantDb, '$transaction'>, head: HeadClaim, e: DispatchedEvent, c: ProjectionContract | HandoffContract): Promise<RunResult & { events?: number }> {
  try {
    return await db.$transaction(async (tx) => {
      if (!(await lockHead(tx, head))) return { kind: 'stale' as const };
      await tx.$queryRaw`SELECT 1 FROM event_dispatch WHERE event_id = ${e.id}::uuid FOR UPDATE`;
      const claim = await claimReceipt(tx, e.id, c.name);
      if (!claim) return { kind: 'skipped' as const };
      const ev = enroll(tx, e.workspaceId);
      try {
        const out = c.mode === 'projection' ? await c.apply(e, tx) : await c.accept(e, tx);
        // `void` / hình lạ không phải bằng chứng hiệu ứng.
        if (!validOutcome(out)) throw new ContractOutcomeError(c.name);
        if (!(await settleReceipt(tx, e.id, c.name, claim, out))) throw new StaleReceiptError();
        return { kind: 'done' as const, outcome: out, events: await ev.finish() };
      } catch (err) {
        ev.abort();
        throw err;
      }
    });
  } catch (err) {
    if (err instanceof StaleReceiptError) return { kind: 'stale' };
    return { kind: 'failed', code: err instanceof ContractOutcomeError ? 'invalid_outcome' : safeCode(err) };
  }
}

class StaleReceiptError extends Error {}
class ContractOutcomeError extends Error {
  constructor(name: string) {
    super(`consumer ${name}: kết cục không hợp lệ`);
  }
}

/** Mã lỗi an toàn — tên lớp / code, không message (có thể chứa dữ liệu khách). */
export const safeCode = (err: unknown): string => {
  const e = err as { code?: unknown; name?: unknown };
  return String(typeof e?.code === 'string' ? e.code : typeof e?.name === 'string' ? e.name : 'error').slice(0, 60);
};
