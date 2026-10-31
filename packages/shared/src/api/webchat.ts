// Widget chat website (TIP-017, REQ-B05; Blueprint §4.4 channels, §4.6 namespace `/widget`):
// - Cài đặt › Trợ lý AI website: `GET /v1/settings/widget` (FE ↔ BE — mock transport parse cùng schema).
// - Giao thức `/widget` (widget JS ↔ API): handshake `auth: { public_key, visitor_token? }`; client → server `visitor.hello`,
//   `message.send` (ack `{ data } | { error: { code } }`); server → client `message.new`, `agent.status`.
import { z } from 'zod';

export const WIDGET_ACTION_KEYS = ['order', 'faq'] as const;
export const WIDGET_KNOWLEDGE = ['catalog', 'price', 'policy', 'faq', 'company', 'process', 'website'] as const;
export const WIDGET_COLLECT = ['answer', 'lead', 'ticket', 'booking', 'quote', 'contract', 'debt'] as const;
export const PRECHAT_FIELDS = ['name', 'phone', 'email'] as const;

export const widgetSettingsSchema = z.object({
  /** Widget đang chạy (đã bật, tài khoản webchat kết nối, không tạm dừng). */
  enabled: z.boolean(),
  channel_account_id: z.string().nullable(),
  public_key: z.string().nullable(),
  name: z.string(),
  greeting: z.string(),
  color: z.string(),
  allowed_domains: z.array(z.string()),
  ai_chat: z.boolean(),
  prechat: z.boolean(),
  actions: z.array(z.object({ key: z.string(), color: z.string(), on: z.boolean() })),
  ai_on: z.boolean(),
  /** Tên agent đang chạy (chip) — song song với `agent_ids` (TIP-022: chọn agent gửi id). */
  agents: z.array(z.string()),
  agent_ids: z.array(z.string()).optional(),
  agent: z.string(),
  handoff: z.number().int(),
  knowledge: z.array(z.string()),
  knowledge_on: z.array(z.string()),
  tone: z.enum(['friendly', 'professional', 'brief']),
  mode: z.enum(['auto', 'human', 'hybrid']),
  collect: z.array(z.string()),
  collect_on: z.array(z.string()),
  kpis: z.object({ clicks: z.number().int(), chats: z.number().int(), running: z.number().int(), total: z.number().int() }),
  /** Mã nhúng — '' khi chưa bật lần nào. */
  embed: z.string(),
});
export type WidgetSettingsDto = z.infer<typeof widgetSettingsSchema>;

// ── Giao thức `/widget` ──
export const WIDGET_NAMESPACE = '/widget';

export const visitorHelloInput = z.object({
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().max(120).optional(),
  page_url: z.string().max(500).optional(),
  locale: z.enum(['vi', 'en']).optional(),
});

export const widgetMessageSchema = z.object({
  /** Tin khách: `client_id` widget sinh; tin shop: id phía kênh (trùng `message.new` realtime). */
  id: z.string(),
  direction: z.enum(['in', 'out']),
  text: z.string(),
  at: z.string(),
  attachments: z.array(z.object({ url: z.string(), mime: z.string(), name: z.string().optional() })).optional(),
});
export type WidgetMessage = z.infer<typeof widgetMessageSchema>;

export const visitorHelloResult = z.object({
  visitor_id: z.string(),
  visitor_token: z.string(),
  config: z.object({
    name: z.string(),
    greeting: z.string(),
    color: z.string(),
    prechat: z.object({ enabled: z.boolean(), fields: z.array(z.enum(PRECHAT_FIELDS)) }),
  }),
  /** Đã khai đủ pre-chat (hoặc pre-chat tắt) — được gửi tin. */
  ready: z.boolean(),
  messages: z.array(widgetMessageSchema),
});
export type VisitorHelloResult = z.infer<typeof visitorHelloResult>;

export const widgetSendInput = z.object({
  client_id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  text: z.string().trim().min(1).max(4000),
});
