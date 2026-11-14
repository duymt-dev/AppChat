// Phát tin tới widget (adapter webchat — Blueprint §4.6 `/widget` server → client): worker ROLE=channels không có server Socket.IO
// → redis-emitter vào namespace `/widget`, phòng của khách web; node API (redis-adapter) chuyển tới socket. Test dùng bản bộ nhớ.
import { Emitter } from '@socket.io/redis-emitter';
import type { Redis } from 'ioredis';
import type { WidgetOutMessage, WidgetPublisher } from '@appchat/channels';
import { WIDGET_NAMESPACE } from '@appchat/shared';

/** Phòng của một khách web (mọi tab cùng `visitor_token`). */
export const visitorRoom = (visitorId: string) => `wv:${visitorId}`;

export class RedisWidgetPublisher implements WidgetPublisher {
  private readonly emitter: ReturnType<Emitter['of']>;

  constructor(client: Redis) {
    this.emitter = new Emitter(client).of(WIDGET_NAMESPACE);
  }

  toVisitor(visitorId: string, event: 'message.new', data: WidgetOutMessage): void {
    this.emitter.to(visitorRoom(visitorId)).emit(event, data);
  }
}

export class MemoryWidgetPublisher implements WidgetPublisher {
  readonly sent: { visitorId: string; event: string; data: WidgetOutMessage }[] = [];
  toVisitor(visitorId: string, event: 'message.new', data: WidgetOutMessage): void {
    this.sent.push({ visitorId, event, data });
  }
}
