// Adapter Website Chat (TIP-017, Blueprint §6 webchat): không giữ phiên (session `webhook` — khách nối thẳng API qua namespace
// `/widget`). Tin vào do API đẩy `NormalizedInbound` vào hàng đợi chung; gửi = phát `message.new` tới phòng của khách web qua
// `WidgetPublisher` (core cài bằng redis-emitter — gói channels không biết Socket.IO / Redis).
import { randomUUID } from 'node:crypto';
import type { ChannelAdapter, HealthStatus, OutboundMessage } from '../types';
import { webchatManifest } from './manifest';

/** Tin gửi tới widget (shape `widgetMessageSchema` của @appchat/shared). */
export interface WidgetOutMessage {
  id: string;
  direction: 'out';
  text: string;
  at: string;
  attachments?: { url: string; mime: string; name?: string }[];
}

export interface WidgetPublisher {
  /** Phát tới mọi tab của khách web `visitorId` (thread của hội thoại webchat = id khách web). */
  toVisitor(visitorId: string, event: 'message.new', data: WidgetOutMessage): void;
}

export class WebchatAdapter implements ChannelAdapter {
  readonly manifest = webchatManifest;

  constructor(
    private readonly publisher: WidgetPublisher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async send(_accountId: string, msg: OutboundMessage): Promise<{ externalMsgId: string }> {
    const id = `o-${randomUUID()}`;
    this.publisher.toVisitor(msg.externalThreadId, 'message.new', {
      id,
      direction: 'out',
      text: msg.text ?? '',
      at: this.now().toISOString(),
      ...(msg.attachments?.length ? { attachments: msg.attachments } : {}),
    });
    return { externalMsgId: id };
  }

  /** Không có phiên phía nhà cung cấp — tài khoản chạy được khi API nhận kết nối (trạng thái ở DB). */
  async probe(): Promise<HealthStatus> {
    return 'connected';
  }
}
