// Tác vụ tự chủ (Cowork — REQ-D12, E08, E13; Blueprint §5.4): cách chạy, nhóm dữ liệu / nhóm công cụ (chip FE → action được
// dùng + data scope), sự kiện kích hoạt được, mẫu chủ động (follow-up, báo giá treo, nhắc hẹn, chăm sóc sau mua, briefing sáng).
// Một nguồn cho FE + core.
import type { ScopeModule } from '../authz/permissions';

export const AI_TASK_TRIGGERS = ['manual', 'schedule', 'event'] as const;
export type AiTaskTrigger = (typeof AI_TASK_TRIGGERS)[number];

/** Phòng ban hiển thị (prototype TKDATA departments) — nhãn, không phải bảng. */
export const AI_TASK_DEPARTMENTS = ['Marketing', 'Kinh doanh', 'CSKH', 'Vận hành', 'Tài chính'] as const;

/**
 * Nhóm dữ liệu được cấp (prototype "Dữ liệu được cấp quyền"): tiền tố action id dùng được + module data scope mở.
 * Module scope không thuộc nhóm nào đã chọn → `none` trong lượt chạy (không đọc / ghi được).
 */
export const AI_TASK_DATA = {
  // "Khách hàng" gồm cả việc chăm sóc khách: lịch hẹn, ticket (prototype chỉ có 6 nhóm).
  customers: { prefixes: ['contact.', 'follow_up.', 'appointment.', 'ticket.'], scope: ['crm', 'booking', 'support'] },
  orders: { prefixes: ['order.'], scope: ['sales', 'crm'] },
  quotes: { prefixes: ['quote.', 'contract.'], scope: ['sales', 'crm'] },
  invoices: { prefixes: ['invoice.', 'payment.'], scope: ['sales', 'crm'] },
  conversations: { prefixes: ['conversation.', 'message.', 'note.'], scope: ['inbox', 'crm'] },
  files: { prefixes: ['document.'], scope: [] },
} as const satisfies Record<string, { prefixes: readonly string[]; scope: readonly ScopeModule[] }>;
export type AiTaskData = keyof typeof AI_TASK_DATA;
export const AI_TASK_DATA_KEYS = Object.keys(AI_TASK_DATA) as AiTaskData[];

/** Action đọc dùng chung luôn được (tra sản phẩm / tồn kho, kho tri thức, dịch, hội viên, gợi ý chiến dịch). */
export const AI_TASK_COMMON_MODULES = ['catalog', 'ai', 'loyalty', 'marketing'] as const;

/** Nhóm công cụ (prototype "Công cụ được phép dùng"). `report` = gửi kết quả mỗi lần chạy vào Trợ lý AI của người tạo. */
export const AI_TASK_TOOL_KEYS = ['read', 'write', 'message', 'report', 'email'] as const;
export type AiTaskTool = (typeof AI_TASK_TOOL_KEYS)[number];
/** Action gửi email cho khách — thuộc nhóm `email`; mọi action `send` khác thuộc `message`. */
export const AI_TASK_EMAIL_ACTIONS = ['contact.send_email'] as const;

/** Có dùng được action này không theo nhóm công cụ (risk) + nhóm dữ liệu (tiền tố id). */
export function aiTaskAllows(a: { id: string; module: string; risk: string }, data: readonly string[], tools: readonly string[]): boolean {
  const common = (AI_TASK_COMMON_MODULES as readonly string[]).includes(a.module) && a.risk === 'read';
  const inData = data.some((k) => (AI_TASK_DATA[k as AiTaskData]?.prefixes ?? []).some((p) => a.id.startsWith(p)));
  if (!common && !inData) return false;
  if (a.risk === 'read') return true;
  if (a.risk === 'write') return tools.includes('write');
  if (a.risk === 'send') return tools.includes((AI_TASK_EMAIL_ACTIONS as readonly string[]).includes(a.id) ? 'email' : 'message');
  // money / delete / config: không cấp cho tác vụ qua chip (delete luôn qua duyệt, config cấm — policy §3.3).
  return false;
}

/** Module data scope mở theo nhóm dữ liệu đã chọn. */
export const aiTaskScopeModules = (data: readonly string[]): Set<ScopeModule> =>
  new Set(data.flatMap((k) => [...(AI_TASK_DATA[k as AiTaskData]?.scope ?? [])]));

/** Sự kiện kích hoạt được (topic outbox — Blueprint §2.3 "ai tasks" là consumer). */
export const AI_TASK_EVENTS = [
  'contact.created',
  'contact.stage_changed',
  'quote.sent',
  'quote.viewed',
  'quote.rejected',
  'order.created',
  'order.completed',
  'appointment.created',
  'appointment.completed',
  'appointment.no_show',
  'appointment.cancelled',
  'ticket.created',
  'ticket.sla_breached',
  'payment.confirmed',
  // TIP-038: hợp đồng còn 30 ngày (contracts.sweep phát một lần) — tác vụ người dùng đã tạo / bật mới nhận; không tự tạo tác vụ gửi hàng loạt.
  'contract.expiring',
] as const;
export type AiTaskEvent = (typeof AI_TASK_EVENTS)[number];

/** Mẫu chủ động (§5.4). `briefing` tổng hợp không qua model (không tốn credit); còn lại: thu đối tượng → agent soạn + gửi. */
export const AI_TASK_TEMPLATES = ['follow_up', 'stale_quote', 'appointment_reminder', 'aftercare', 'briefing'] as const;
export type AiTaskTemplate = (typeof AI_TASK_TEMPLATES)[number];

export interface AiTaskTemplateDef {
  department: (typeof AI_TASK_DEPARTMENTS)[number];
  cron: string;
  data: AiTaskData[];
  tools: AiTaskTool[];
  /** Tham số mặc định: số ngày im lặng / treo / sau mua, giờ trước hẹn, trần đối tượng mỗi lần. */
  params: Record<string, number>;
}

export const AI_TASK_TEMPLATE_DEFS: Record<AiTaskTemplate, AiTaskTemplateDef> = {
  follow_up: { department: 'Kinh doanh', cron: '0 9 * * 1-6', data: ['customers', 'conversations'], tools: ['read', 'message', 'report'], params: { days: 7, limit: 20 } },
  stale_quote: { department: 'Kinh doanh', cron: '0 10 * * 1-6', data: ['quotes', 'conversations'], tools: ['read', 'message', 'report'], params: { days: 3, limit: 20 } },
  appointment_reminder: { department: 'CSKH', cron: '0 17 * * *', data: ['customers', 'conversations'], tools: ['read', 'message', 'report'], params: { hours: 24, limit: 50 } },
  aftercare: { department: 'CSKH', cron: '0 11 * * *', data: ['orders', 'conversations'], tools: ['read', 'message', 'report'], params: { days: 3, limit: 20 } },
  briefing: { department: 'Vận hành', cron: '0 8 * * *', data: [], tools: ['read', 'report'], params: {} },
};

/** Trần đối tượng một lần chạy (gửi chủ động còn chịu cap kênh / ngày — D35). Không gửi lại hội thoại vừa có tin ra trong 24 giờ. */
export const AI_TASK_MAX_TARGETS = 50;
export const AI_TASK_QUIET_HOURS = 24;
