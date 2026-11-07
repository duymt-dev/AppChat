// Nghe lệnh huỷ run (Redis pub/sub `appchat:ai:cancel`, phát sau commit của run.cancel) → AiRunner của process này dừng các run đó
// ở bước kế tiếp. Mỗi process có runner (api — Trợ lý stream; worker ROLE=ai — agent) nghe riêng; run không chạy ở đây thì bỏ qua.
import type { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { AiRunner } from './runner';
import { AI_CANCEL_CHANNEL } from './runs.service';

export class RunCancelListener implements OnApplicationBootstrap, OnApplicationShutdown {
  private sub: Redis | null = null;

  constructor(
    private readonly redis: Redis | null,
    private readonly runner: AiRunner | null,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.redis || !this.runner) return;
    const runner = this.runner;
    this.sub = this.redis.duplicate();
    await this.sub.subscribe(AI_CANCEL_CHANNEL);
    this.sub.on('message', (_ch, raw: string) => {
      try {
        const ids = (JSON.parse(raw) as { run_ids?: unknown }).run_ids;
        if (Array.isArray(ids)) runner.abort(ids.filter((x): x is string => typeof x === 'string'));
      } catch {
        /* lệnh hỏng — bỏ */
      }
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.sub?.quit().catch(() => undefined);
    this.sub = null;
  }
}
