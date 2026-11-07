// Đo nghiệp vụ không chen vào logic (TIP-045b): bọc `ActionExecutor.execute` đếm `action_total{action,source,result}` (result = ok /
// accepted / preview / approval / mã lỗi), bọc processor BullMQ đo `job_duration_seconds{queue,result}`, đọc độ sâu queue theo lịch.
// Action id lấy từ registry (tập hữu hạn) — id lạ ghi `unknown`; queue theo họ tên (bỏ hậu tố động).
import type { Queue } from 'bullmq';
import { AppError } from '@appchat/shared';
import type { ActionExecutor } from '../actions/executor';
import { appMetrics } from './registry';

const RESULT_OF_STATUS = (data: unknown, status: number): string => {
  if (status === 200) return 'ok';
  const s = (data as { status?: string } | undefined)?.status;
  return s === 'preview_required' ? 'preview' : s === 'approval_required' ? 'approval' : s === 'job_accepted' ? 'accepted' : `http_${status}`;
};

/** Bọc executor một lần (gọi lại không bọc chồng). */
export function instrumentExecutor(ex: ActionExecutor, known: (id: string) => boolean): ActionExecutor {
  const marked = ex as ActionExecutor & { __metered?: true };
  if (marked.__metered) return ex;
  const run = ex.execute.bind(ex);
  const m = appMetrics();
  marked.execute = (async (ctx, actionId, input) => {
    const action = known(actionId) ? actionId : 'unknown';
    const source = ctx.source ?? 'unknown';
    try {
      const out = await run(ctx, actionId, input);
      m.actionTotal.inc({ action, source, result: RESULT_OF_STATUS(out.data, out.status) });
      return out;
    } catch (e) {
      m.actionTotal.inc({ action, source, result: e instanceof AppError ? e.code : 'INTERNAL' });
      throw e;
    }
  }) as ActionExecutor['execute'];
  marked.__metered = true;
  return ex;
}

/** Họ queue: bỏ phần sau `:` / `{` và hậu tố id động (`chsend-<uuid>` → `chsend`). */
export const queueFamily = (name: string) => name.split(/[:{]/)[0]!.replace(/-[0-9a-f]{8}-?[0-9a-f-]{12,}$/i, '').slice(0, 48) || 'unknown';

/** Bọc processor BullMQ: đo thời gian + kết quả theo họ queue. */
export function meteredProcessor<J, R>(queue: string, fn: (job: J) => Promise<R>): (job: J) => Promise<R> {
  const m = appMetrics();
  const family = queueFamily(queue);
  return async (job) => {
    const end = m.jobDuration.startTimer({ queue: family });
    try {
      const r = await fn(job);
      end({ result: 'ok' });
      return r;
    } catch (e) {
      end({ result: 'error' });
      throw e;
    }
  };
}

/** Đọc số job theo trạng thái cho các queue khai báo (gọi theo lịch hoặc lúc scrape). */
export async function sampleQueues(queues: readonly Queue[]): Promise<void> {
  const m = appMetrics();
  await Promise.all(
    queues.map(async (q) => {
      const c = await q.getJobCounts('waiting', 'active', 'delayed', 'failed').catch(() => null);
      if (!c) return;
      for (const [state, n] of Object.entries(c)) m.queueDepth.set({ queue: queueFamily(q.name), state }, n);
    }),
  );
}
