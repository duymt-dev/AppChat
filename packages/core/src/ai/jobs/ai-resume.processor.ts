// Worker ROLE=ai: processor queue `ai-resume` (Blueprint §5.1) — job `decided` chạy action đã duyệt + chạy tiếp run, job `expire`
// hết hạn duyệt quá 72 giờ (D52). Idempotent theo trạng thái duyệt (resume.ts).
import { Worker } from '../../kernel/jobs/with-job-context';
import type { Redis } from 'ioredis';
import type { AppLogger } from '../../kernel/logger/logger';
import { AI_RESUME_QUEUE, type ResumeJob } from '../approvals/resume.queue';
import { resumeApproval, type ResumeDeps } from '../approvals/resume';

export function startAiResumeWorker(redis: Redis, deps: ResumeDeps, log: AppLogger): Worker<ResumeJob> {
  const w = new Worker<ResumeJob>(AI_RESUME_QUEUE, (job) => resumeApproval(deps, job.data.ws, job.data.approval_id, job.name === 'expire' ? 'expire' : 'decided'), {
    connection: redis.duplicate(),
    concurrency: 4,
  });
  w.on('error', (err) => log.warn({ err }, 'ai-resume worker error'));
  return w;
}
