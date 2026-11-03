// Worker ROLE=ai: processor queue `assistant-turn` (TIP-023c SPEC vận hành) — chạy lượt Trợ lý đã claim ở API (runTurn: lease có fence,
// quyền HIỆN HÀNH của người ra lệnh, sự kiện ghi sổ trước khi phát SSE). Job lặp / run đã chạy → bỏ qua (không gọi lại model).
import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { AppLogger } from '../../kernel/logger/logger';
import { ASSISTANT_TURN_QUEUE, type TurnJob } from '../assistant/genui/turn-request.consumer';
import { runTurn, type RunDeps } from '../assistant/turn.service';

export interface TurnWorkerDeps extends RunDeps {
  tenants: TenantDbResolver;
  /** AuthzContext hiện tại của người ra lệnh (thành viên còn hoạt động) — null → lượt chốt FORBIDDEN. */
  commander(ws: string, userId: string): Promise<AuthzContext | null>;
}

export function startAssistantTurnWorker(redis: Redis, d: TurnWorkerDeps, log: AppLogger): Worker<TurnJob> {
  const w = new Worker<TurnJob>(
    ASSISTANT_TURN_QUEUE,
    async (job) => {
      const db = await d.tenants.get(TenantContexts.system(job.data.ws, 'assistant-turn'));
      const run = await db.aiRun.findUnique({ where: { id: job.data.run_id }, select: { initiatedByUserId: true } });
      if (!run?.initiatedByUserId) return;
      await runTurn(d, db, job.data.ws, job.data.run_id, await d.commander(job.data.ws, run.initiatedByUserId));
    },
    { connection: redis.duplicate(), concurrency: 8 },
  );
  w.on('error', (err) => log.warn({ err }, 'assistant-turn worker error'));
  return w;
}
