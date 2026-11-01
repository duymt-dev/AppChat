// Đẩy nguồn vào queue `kb-ingest` (worker ROLE=ai) sau commit của action. Job id = `kb-<source>-<ingest_seq>` → bấm "Học lại" hai lần
// liền không nạp hai lần song song; job lỗi thử lại 3 lần. Nguồn kẹt `pending` (API mất Redis lúc đẩy) → "Học lại" đẩy lại (DC-107).
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { KB_INGEST_QUEUE, type KbIngestJob } from './ingest';

export class KbIngestQueue {
  private readonly q: Queue<KbIngestJob>;

  constructor(redis: Redis) {
    this.q = new Queue<KbIngestJob>(KB_INGEST_QUEUE, { connection: redis.duplicate() });
  }

  async push(ws: string, sources: { id: string; seq: number }[]): Promise<void> {
    if (!sources.length) return;
    await this.q.addBulk(
      sources.map(({ id, seq }) => ({
        name: 'ingest',
        data: { ws, source_id: id },
        opts: { jobId: `kb-${id}-${seq}`, attempts: 3, backoff: { type: 'exponential', delay: 5_000 }, removeOnComplete: 1000, removeOnFail: 1000 },
      })),
    );
  }

  onApplicationShutdown(): Promise<void> {
    return this.q.close();
  }
}
