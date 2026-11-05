// JSON client chờ cùng run (TIP-023c SPEC vận hành): POST /assistant/messages không chạy model ở API — claim + outbox rồi CHỜ sự kiện
// `done` của run trên sổ stream (worker ROLE=ai ghi bền trước khi phát Redis). Subscribe kênh run TRƯỚC khi đọc sổ (không lọt `done`
// giữa hai bước); đọc lại sổ định kỳ phòng pub/sub rớt. Hết hạn chờ → trả phần đã có + run_id (client nối SSE để nhận tiếp).
import type { Redis } from 'ioredis';
import type { TenantDb } from '@appchat/db';
import { runChannel } from './stream';

export const TURN_WAIT_MS = 120_000;
const POLL_MS = 1_000;

type Db = Pick<TenantDb, 'assistantEvent'>;

const hasDone = async (db: Db, runId: string) => (await db.assistantEvent.findFirst({ where: { runId, eventType: 'done' }, select: { id: true } })) !== null;

/** true khi run đã có `done` trên sổ; false khi hết hạn chờ. */
export async function waitDone(db: Db, redis: Pick<Redis, 'duplicate'> | null, runId: string, ms = TURN_WAIT_MS): Promise<boolean> {
  const sub = redis?.duplicate() ?? null;
  let wake: () => void = () => undefined;
  try {
    if (sub) {
      sub.on('message', (_ch, raw: string) => {
        if (raw.includes('"type":"done"')) wake();
      });
      await sub.subscribe(runChannel(runId));
    }
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await hasDone(db, runId)) return true;
      await new Promise<void>((r) => {
        const t = setTimeout(r, Math.min(POLL_MS, Math.max(0, end - Date.now())));
        wake = () => {
          clearTimeout(t);
          r();
        };
      });
    }
    return hasDone(db, runId);
  } finally {
    await sub?.quit().catch(() => undefined);
  }
}

