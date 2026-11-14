// Queue `ai-resume` (worker ROLE=ai — Blueprint §5.1): sau khi người quyết, job chạy action đã duyệt (đúng một lần) rồi chạy tiếp
// run; job trễ tới `expires_at` → hết hạn duyệt (72 giờ — D52) nếu vẫn chờ. Job id cố định theo duyệt → đẩy hai lần chỉ một job.
import { Queue } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';

export const AI_RESUME_QUEUE = 'ai-resume';

export interface ResumeJob {
  ws: string;
  approval_id: string;
}

export class ResumeQueue {
  private readonly q: Queue<ResumeJob>;

  constructor(redis: Redis) {
    this.q = new Queue<ResumeJob>(AI_RESUME_QUEUE, { connection: redis.duplicate() });
  }

  /** Đã quyết → chạy ngay. `jobKey` khác (vd. `op-<thao tác>` — TIP-045b) = lượt tiếp tục sau khi thao tác nền tảng áp xong. */
  async push(ws: string, approvalId: string, jobKey?: string): Promise<void> {
    await this.q.add('decided', { ws, approval_id: approvalId }, { jobId: jobKey ? `ap-${approvalId}-${jobKey}` : `ap-${approvalId}`, attempts: 5, backoff: { type: 'exponential', delay: 3_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  /** Hẹn kiểm hết hạn đúng lúc `expires_at`. */
  async expireAt(ws: string, approvalId: string, at: Date, now: Date): Promise<void> {
    const delay = Math.max(0, at.getTime() - now.getTime());
    await this.q.add('expire', { ws, approval_id: approvalId }, { jobId: `ap-exp-${approvalId}`, delay, attempts: 3, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  onApplicationShutdown(): Promise<void> {
    return this.q.close();
  }
}
