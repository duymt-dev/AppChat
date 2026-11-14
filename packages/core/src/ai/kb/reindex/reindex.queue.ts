// Queue `kb-reindex` (TIP-020e §2.3, worker ROLE=ai). Job id tất định `kb-reindex-<generation>-<cursor>` (BullMQ cấm `:` trong id
// tự đặt) → bấm trùng / quét khôi phục đẩy lại cùng điểm không chạy song song hai bản; tiến độ thật nằm ở DB (cursor + lease), job
// chỉ là cú hích. Đẩy SAU commit (afterCommit) — Redis lỗi thì quét khôi phục (lease hết hạn) đẩy lại. Job `purge` dọn khe đích của
// generation đã huỷ / thay thế.
import type { Redis } from 'ioredis';
import { Queue } from '../../../kernel/jobs/with-job-context';

export const KB_REINDEX_QUEUE = 'kb-reindex';

export interface KbReindexJob {
  ws: string;
  generation_id: string;
  op?: 'run' | 'purge';
}

export const reindexJobId = (generationId: string, cursor: string | null) => `kb-reindex-${generationId}-${cursor ?? 'start'}`;

export class KbReindexQueue {
  private readonly q: Queue<KbReindexJob>;

  constructor(redis: Redis) {
    this.q = new Queue<KbReindexJob>(KB_REINDEX_QUEUE, { connection: redis.duplicate() });
  }

  /** `cursor` = điểm tiếp tục (id đoạn) — 'purge' = job dọn khe đích. */
  async push(ws: string, generationId: string, cursor: string | null): Promise<void> {
    const op = cursor === 'purge' ? 'purge' : 'run';
    await this.q.add(op, { ws, generation_id: generationId, op }, { jobId: reindexJobId(generationId, cursor), attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000, removeOnFail: 1000 });
  }

  onApplicationShutdown(): Promise<void> {
    return this.q.close();
  }
}
