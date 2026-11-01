// Giao thức `/widget` phía trình duyệt — khớp packages/shared/src/api/webchat.ts (widget không import gói nội bộ để giữ bundle nhỏ;
// test hợp đồng ở apps/api parse cùng schema shared).
export interface WidgetMessage {
  id: string;
  direction: 'in' | 'out';
  text: string;
  at: string;
  attachments?: { url: string; mime: string; name?: string }[];
}

export type PrechatField = 'name' | 'phone' | 'email';

export interface HelloResult {
  visitor_id: string;
  visitor_token: string;
  config: { name: string; greeting: string; color: string; prechat: { enabled: boolean; fields: PrechatField[] } };
  ready: boolean;
  messages: WidgetMessage[];
}

export type Ack<T> = { data: T } | { error: { code: string; fields?: Record<string, string> } };

/** Cổng giao tiếp với server (Socket.IO thật ở main.ts; test dùng bản giả). */
export interface WidgetTransport {
  hello(p: { name?: string; phone?: string; email?: string; page_url?: string; locale?: string }): Promise<Ack<HelloResult>>;
  send(p: { client_id: string; text: string }): Promise<Ack<{ id: string; at: string }>>;
  onMessage(fn: (m: WidgetMessage) => void): void;
  onDown(fn: (code: string) => void): void;
}
