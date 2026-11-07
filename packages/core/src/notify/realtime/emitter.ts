// Phát realtime từ worker (Blueprint §4.6: `@socket.io/redis-emitter`) — không cần server Socket.IO trong process này.
// Test / process không Redis dùng MemoryRealtimeEmitter.
import { Emitter } from '@socket.io/redis-emitter';
import type { Redis } from 'ioredis';
import { RT_EVENT, WS_NAMESPACE, type RealtimeEnvelope } from './envelope';

export interface RealtimeEmitter {
  publish(env: RealtimeEnvelope): void;
}

export const REALTIME_EMITTER = Symbol('REALTIME_EMITTER');

export class RedisRealtimeEmitter implements RealtimeEmitter {
  private readonly emitter: Emitter;

  constructor(
    private readonly client: Redis,
    onError: (err: unknown) => void = () => undefined,
  ) {
    // `@socket.io/redis-emitter` gọi `client.publish()` rồi bỏ promise: Redis rớt / đang `quit` → unhandled rejection (sập process theo
    // chính sách Node). Bọc publish để nuốt + báo lỗi — realtime chỉ là gợi ý làm mới, dữ liệu thật vẫn đọc lại qua REST (outbox §8).
    const safe = new Proxy(client, {
      get: (t, k, r) =>
        k === 'publish'
          ? (...a: Parameters<Redis['publish']>) => t.publish(...a).catch((err: unknown) => (onError(err), 0))
          : Reflect.get(t, k, r),
    });
    this.emitter = new Emitter(safe).of(WS_NAMESPACE);
  }

  publish(env: RealtimeEnvelope): void {
    this.emitter.serverSideEmit(RT_EVENT, env);
  }

  async close(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }
}

export class MemoryRealtimeEmitter implements RealtimeEmitter {
  readonly sent: RealtimeEnvelope[] = [];
  publish(env: RealtimeEnvelope): void {
    this.sent.push(env);
  }
}
