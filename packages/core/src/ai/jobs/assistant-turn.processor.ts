// Worker ROLE=ai: processor queue `assistant-turn` (TIP-023c SPEC vận hành) — chạy lượt Trợ lý đã claim ở API (runTurn: lease có fence,
// quyền HIỆN HÀNH của người ra lệnh, sự kiện ghi sổ trước khi phát SSE). Job lặp / run đã chạy → bỏ qua (không gọi lại model).
import { Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { AppLogger } from '../../kernel/logger/logger';
import { ASSISTANT_TURN_QUEUE, type TurnJob } from '../assistant/genui/turn-request.consumer';
import { runTurn, type RunDeps } from '../assistant/turn.service';
import { continuePlanTurn } from '../assistant/plans/continue';

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
      const authz = await d.commander(job.data.ws, run.initiatedByUserId);
      // TIP-023d §3.6: job `plan` = chạy tiếp từ checkpoint sau plan_resume (claim CAS — lặp không gọi model lần hai).
      if (job.name === 'plan') await continuePlanTurn(d, db, job.data.ws, job.data.run_id, authz, job.data.plan_epoch === undefined ? undefined : { epoch: job.data.plan_epoch, ...(job.data.plan_step === undefined ? {} : { step: job.data.plan_step }) });
      else await runTurn(d, db, job.data.ws, job.data.run_id, authz);
    },
    { connection: redis.duplicate(), concurrency: 8 },
  );
  w.on('error', (err) => log.warn({ err }, 'assistant-turn worker error'));
  return w;
}
