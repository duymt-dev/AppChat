// Việc nền phân tích marketing (TIP-037): campaign.analyze ghi run `queued` + event `campaign.analysis_requested` (cùng transaction) →
// consumer `marketing.analyze` (queue `events`, ROLE=jobs) đẩy job `campaign-analyze` (jobId = run → đẩy lặp chỉ một job) → worker ROLE=ai
// gọi model (quyền HIỆN TẠI của người yêu cầu — rời workspace / mất campaign.manage thì run failed) rồi ghi gợi ý qua action hệ thống
// campaign.store_analysis (Executor). Không chạy model trong request, không setTimeout giả.
import type { Redis } from 'ioredis';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { can, campaignAnalyzeEvent, type AuthzContext } from '@appchat/shared';
import { Queue, Worker } from '../../kernel/jobs/with-job-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { AppLogger } from '../../kernel/logger/logger';
import type { AiRunner } from '../../ai/runs/runner';
import { MARKETING_ACTORS, systemCtx } from '../services/marketing-system';
import { aggregateCdp, runAnalysis } from './marketing-ai.service';

export const CAMPAIGN_ANALYZE_QUEUE = 'campaign-analyze';
export const ANALYZE_CONSUMER = 'marketing.analyze';

export interface AnalyzeJob {
  ws: string;
  run_id: string;
  user_id: string;
}

export class CampaignAnalyzeQueue {
  private readonly q: Queue<AnalyzeJob>;

  constructor(redis: Redis) {
    this.q = new Queue<AnalyzeJob>(CAMPAIGN_ANALYZE_QUEUE, { connection: redis.duplicate() });
  }

  async push(j: AnalyzeJob): Promise<void> {
    await this.q.add('analyze', j, { jobId: `cana-${j.run_id}`, attempts: 2, backoff: { type: 'exponential', delay: 15_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  close(): Promise<void> {
    return this.q.close();
  }
}

export const analyzeConsumer = (queue: Pick<CampaignAnalyzeQueue, 'push'>): EventConsumer => ({
  name: ANALYZE_CONSUMER,
  topics: ['campaign.analysis_requested'],
  async handle(e) {
    const p = campaignAnalyzeEvent.parse({ ...e.payload, ws: e.workspaceId, occurred_at: (e.payload.occurred_at as string) ?? new Date().toISOString() });
    await queue.push({ ws: e.workspaceId, run_id: p.run_id, user_id: p.requested_by });
  },
});

export interface AnalyzeDeps {
  tenants: TenantDbResolver;
  runner: AiRunner;
  executor: Pick<ActionExecutor, 'execute'>;
  authzOf: (ws: string, userId: string) => Promise<AuthzContext | null>;
  now: () => Date;
}

/**
 * Một lượt phân tích. Action chỉ ghi yêu cầu (event có run_id cấp sẵn); run tạo ở đây với đúng id → chạy lại sau khi đã có run: xong thì
 * chỉ ghi lại gợi ý (idempotent), đang chạy / lỗi thì bỏ qua — không gọi model lần hai. Người yêu cầu phải còn campaign.manage.
 */
export async function processAnalyze(d: AnalyzeDeps, j: AnalyzeJob): Promise<'stored' | 'skipped' | 'forbidden'> {
  const db = await d.tenants.get(TenantContexts.system(j.ws, 'campaign.analyze'));
  const store = () => d.executor.execute(systemCtx(j.ws, MARKETING_ACTORS.analysis, `${j.run_id}:store`), 'campaign.store_analysis', { run_id: j.run_id });
  const run = await db.aiRun.findUnique({ where: { id: j.run_id }, select: { status: true } });
  if (run) {
    if (run.status !== 'completed') return 'skipped';
    await store();
    return 'stored';
  }
  const authz = await d.authzOf(j.ws, j.user_id);
  if (!authz || !can(authz, 'campaign.manage')) return 'forbidden';
  await runAnalysis(db, d.runner, d.now, j.ws, { runId: j.run_id, userId: j.user_id, data: await aggregateCdp(db, authz, d.now()) });
  await store();
  return 'stored';
}

export function startAnalyzeWorker(redis: Redis, d: AnalyzeDeps, log: AppLogger): Worker<AnalyzeJob> {
  const w = new Worker<AnalyzeJob>(CAMPAIGN_ANALYZE_QUEUE, async (job) => processAnalyze(d, job.data), { connection: redis.duplicate(), concurrency: 2 });
  w.on('failed', (job, err) => log.warn({ err, run: job?.data.run_id }, 'campaign-analyze lỗi'));
  return w;
}
