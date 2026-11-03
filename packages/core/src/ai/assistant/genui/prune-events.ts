// Dọn sổ sự kiện stream Trợ lý (TIP-023c SPEC vận hành): sự kiện delta / ui / … chỉ để replay SSE trong 24h (`expires_at`); quá hạn →
// xoá theo lô (index `assistant_event_expires_at_idx` (expires_at, id)), mỗi lô ≤ 500 dòng, tối đa 20 lô mỗi workspace mỗi lượt — lượt
// sau làm tiếp (checkpoint = chính `expires_at` còn lại). Tin / lịch sử phiên (`assistant_message`) KHÔNG bị xoá theo TTL stream.
// Không quét mọi tenant: chỉ workspace trong tập `assistant:events:armed` (đánh dấu khi ghi sự kiện); dọn sạch thì bỏ khỏi tập. Giờ theo Clock.
import { WorkspaceNotFoundError, type TenantDb } from '@appchat/db';
import { EventStore } from './event-store';

export const PRUNE_BATCH = 500;
export const PRUNE_MAX_BATCHES = 20;
export const EVENTS_ARMED_KEY = 'assistant:events:armed';
export const EVENTS_PRUNE_EVERY_MS = 15 * 60_000;

type Db = Pick<TenantDb, '$queryRaw' | 'assistantEvent'>;

export interface ArmedEvents {
  list(): Promise<string[]>;
  remove(ws: string): Promise<void>;
}

/** Xoá sự kiện quá hạn của một workspace; trả số dòng đã xoá và còn sự kiện (chưa hạn hoặc chưa dọn hết) hay không. */
export async function pruneWorkspaceEvents(db: Db, now: Date): Promise<{ deleted: number; remaining: boolean }> {
  const store = new EventStore(db, () => now);
  let deleted = 0;
  for (let i = 0; i < PRUNE_MAX_BATCHES; i++) {
    const n = await store.prune(PRUNE_BATCH);
    deleted += n;
    if (n < PRUNE_BATCH) break;
  }
  const remaining = (await db.assistantEvent.findFirst({ select: { id: true } })) !== null;
  return { deleted, remaining };
}

/** Một lượt dọn: mỗi workspace đã đánh dấu; lỗi một workspace không chặn workspace khác. Không còn sự kiện → bỏ khỏi tập. */
export async function pruneArmedEvents(armed: ArmedEvents, tenant: (ws: string) => Promise<Db>, now: () => Date, onError: (ws: string, err: unknown) => void): Promise<number> {
  let total = 0;
  for (const ws of await armed.list()) {
    try {
      const r = await pruneWorkspaceEvents(await tenant(ws), now());
      total += r.deleted;
      if (!r.remaining) await armed.remove(ws);
    } catch (err) {
      // Workspace đã xoá (test / huỷ đăng ký) → bỏ khỏi tập, không cảnh báo lặp mỗi lượt.
      if (err instanceof WorkspaceNotFoundError) await armed.remove(ws);
      else onError(ws, err);
    }
  }
  return total;
}
