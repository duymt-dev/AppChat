// Worker ROLE=ai: processor queue `agent-reply` (Blueprint §5.3) — một lượt agent trực kênh mỗi job. Khoá Redis theo hội thoại
// (`SET NX PX`) để hai job cùng hội thoại không chạy song song (dedup của BullMQ chỉ gom job đang chờ); job gặp khoá → thử lại
// sau. Lượt xong kiểm lại: còn tin khách mới chưa trả lời (đến lúc đang chạy) → đẩy thêm một job.
import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import type { AppLogger } from '../../kernel/logger/logger';
import { AGENT_REPLY_QUEUE, type ReplyJob } from '../reply/reply.queue';
import { replyTurn, type ReplyDeps } from '../reply/reply.service';

const LOCK_MS = 120_000;

export class ConversationBusy extends Error {
  constructor() {
    super('conversation busy');
    this.name = 'ConversationBusy';
  }
}

export function startAgentReplyWorker(redis: Redis, deps: ReplyDeps, log: AppLogger): Worker<ReplyJob> {
  const w = new Worker<ReplyJob>(
    AGENT_REPLY_QUEUE,
    async (job) => {
      const key = `appchat:agent-reply:lock:${job.data.conversation_id}`;
      if ((await redis.set(key, job.id ?? '1', 'PX', LOCK_MS, 'NX')) !== 'OK') throw new ConversationBusy();
      try {
        return await replyTurn(deps, job.data.ws, job.data.conversation_id);
      } finally {
        await redis.del(key);
      }
    },
    { connection: redis.duplicate(), concurrency: 8 },
  );
  w.on('failed', (job, err) => {
    if (!(err instanceof ConversationBusy)) log.warn({ err, conversation: job?.data.conversation_id }, 'agent-reply lỗi');
  });
  w.on('error', (err) => log.warn({ err }, 'agent-reply worker error'));
  return w;
}
