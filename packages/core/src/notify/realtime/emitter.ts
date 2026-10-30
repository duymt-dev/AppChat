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

  constructor(private readonly client: Redis) {
    this.emitter = new Emitter(client).of(WS_NAMESPACE);
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
