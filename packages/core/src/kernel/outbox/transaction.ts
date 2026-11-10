// Transaction có bộ gom sự kiện (TIP-003b §2.1–2.2): `withEventTransaction(db, ws, fn)` mở transaction tenant, gắn MỘT collector vào
// đúng client transaction (WeakMap — không ngữ cảnh toàn cục, không rò sang request khác), chạy callback (domain + action_log +
// idempotency + CAS undo…), rồi flush cuối DUY NHẤT trước commit. Helper nhận `tx` của caller dùng lại collector — không mở transaction
// lồng. Abort / lỗi → bỏ toàn bộ event đã gom cùng rollback.
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../actions/action-context';
import { EventCollector } from './collector';

const live = new WeakMap<object, EventCollector>();

/** Collector đang gắn với `tx` (nếu transaction đã đăng ký). */
export const collectorOf = (tx: object): EventCollector | undefined => live.get(tx);

export interface EventTransactionResult<T> {
  value: T;
  /** Số event đã ghi ở flush cuối (0 = không cần markDirty). */
  events: number;
}

/** Đăng ký collector cho một transaction ĐÃ mở (chủ transaction tự gọi `finish` trước khi trả về callback). */
export function enroll(tx: TenantTx, workspaceId: string): { collector: EventCollector; finish: () => Promise<number>; abort: () => void } {
  const existing = live.get(tx);
  if (existing) {
    // Helper lồng trong transaction đã đăng ký: dùng chung, flush do chủ ngoài cùng làm.
    if (existing.workspaceId !== workspaceId) throw new Error('enroll: transaction đã gắn workspace khác');
    return { collector: existing, finish: async () => 0, abort: () => undefined };
  }
  const c = new EventCollector(workspaceId);
  live.set(tx, c);
  return {
    collector: c,
    finish: async () => {
      try {
        return await c.flush(tx);
      } finally {
        live.delete(tx);
      }
    },
    abort: () => {
      c.discard();
      live.delete(tx);
    },
  };
}

/** Chạy `fn` trong transaction tenant có collector; flush cuối trước commit. */
export async function withEventTransaction<T>(db: Pick<TenantDb, '$transaction'>, workspaceId: string, fn: (tx: TenantTx) => Promise<T>, opts?: { timeout?: number; maxWait?: number }): Promise<EventTransactionResult<T>> {
  return db.$transaction(async (tx) => {
    const e = enroll(tx, workspaceId);
    try {
      const value = await fn(tx);
      return { value, events: await e.finish() };
    } catch (err) {
      e.abort();
      throw err;
    }
  }, opts);
}
