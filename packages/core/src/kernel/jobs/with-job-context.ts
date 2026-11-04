// Truyền traceId xuyên job (ops §1.3 "truyền vào job — BullMQ `data.trace_id`", TIP-045b annex B): mọi queue / worker của core dựng qua
// hai lớp này thay cho `bullmq` trực tiếp. `Queue.add / addBulk` gắn `trace_id` của RequestContext hiện tại vào data object (không ghi đè
// trace có sẵn — event outbox mang `traceId` của lệnh gốc); `Worker` chạy processor trong RequestContext { traceId, source: 'job', job,
// ws } (log mỗi dòng tự có trace) và đo `job_duration_seconds` theo họ queue. Job lập lịch (không có trace) sinh trace mới mỗi lần chạy.
import { Queue as BullQueue, Worker as BullWorker, type Job, type Processor, type WorkerOptions } from 'bullmq';
import { uuidv7 } from '../ids';
import { meteredProcessor } from '../metrics/collectors';
import { RequestContext, acceptTraceId } from '../request-context';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v) && !Buffer.isBuffer(v);

/** Gắn trace hiện tại vào data object; data đã có trace / không phải object / ngoài ngữ cảnh → giữ nguyên. */
export function withTrace<D>(data: D): D {
  const trace = RequestContext.get()?.traceId;
  if (!trace || !isRec(data) || data.trace_id || data.traceId) return data;
  return { ...data, trace_id: trace } as D;
}

/** Trace của một job: `trace_id` (chuẩn) hoặc `traceId` (event outbox) hợp lệ; không có → sinh mới. */
export function jobTraceId(data: unknown): string {
  if (isRec(data)) return acceptTraceId(String(data.trace_id ?? data.traceId ?? '')) ?? uuidv7();
  return uuidv7();
}

const workspaceOf = (data: unknown): string | undefined => {
  if (!isRec(data)) return undefined;
  const v = data.workspaceId ?? data.workspace_id ?? data.ws;
  return typeof v === 'string' && v ? v : undefined;
};

/** Bọc processor: ngữ cảnh log + metric. Dùng trực tiếp cho processor không đi qua `Worker` dưới đây. */
export function tracedProcessor<D, R, N extends string>(queue: string, fn: Processor<D, R, N>): Processor<D, R, N> {
  const metered = meteredProcessor(queue, (a: { job: Job<D, R, N>; token?: string }) => fn(a.job, a.token));
  return (job, token) =>
    RequestContext.run({ traceId: jobTraceId(job.data), source: 'job', job: job.name, ws: workspaceOf(job.data) }, () => metered({ job, token }));
}

/* eslint-disable @typescript-eslint/no-explicit-any -- giữ đúng generic mặc định của bullmq */
export class Queue<T = any, R = any, N extends string = string> extends BullQueue<T, R, N> {
  override add(...a: Parameters<BullQueue<T, R, N>['add']>): ReturnType<BullQueue<T, R, N>['add']> {
    a[1] = withTrace(a[1]);
    return super.add(...a);
  }

  override addBulk(jobs: Parameters<BullQueue<T, R, N>['addBulk']>[0]): ReturnType<BullQueue<T, R, N>['addBulk']> {
    return super.addBulk(jobs.map((j) => ({ ...j, data: withTrace(j.data) })));
  }
}

export class Worker<D = any, R = any, N extends string = string> extends BullWorker<D, R, N> {
  constructor(name: string, processor?: string | URL | null | Processor<D, R, N>, opts?: WorkerOptions) {
    super(name, typeof processor === 'function' ? tracedProcessor(name, processor) : processor, opts);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
