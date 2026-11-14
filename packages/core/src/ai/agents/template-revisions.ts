// Phiên bản mặc định của mẫu agent (TIP-022b E). Rev 2: Sales thêm tra / chấp nhận / từ chối báo giá, đơn, lịch hẹn, ticket, gửi tin;
// Booking thêm tra / đổi / huỷ lịch. Nâng cấp KHÔNG ghi đè sửa đổi của Quản trị nền tảng: chỉ mẫu còn đúng y bản dựng sẵn rev trước mới
// được nâng; mẫu đã sửa giữ nguyên + báo xem trước thay thế cho quản trị. Agent đã tạo / đã xuất bản không đổi (không tự cấp quyền) — đề
// xuất diff đi qua agent.update + xuất bản như thường. Mỗi id phải tồn tại + agentGrantable (sai chính tả → test đỏ, không lặng lẽ bỏ).
// Rev 3 (TIP-022c §4.1): Sales thêm `stock.get` (câu tồn có căn cứ) + `quote.request_revision` (khách xin sửa báo giá — qua cổng ý định
// khách ≥ 70%). Nâng chỉ mẫu còn đúng y bản dựng sẵn rev 1 HOẶC rev 2; giao với quyền người tạo vẫn áp lúc tạo / xuất bản agent.
import { registry, isAgentGrantable } from '@appchat/actions';

export const TEMPLATE_REVISION = 3;

type RoleDefaults = { tools: string[]; intents: number[]; prompt: number };

/** Rev 1 (TIP-021) — giữ nguyên để nhận ra mẫu chưa bị sửa. */
export const ROLE_DEFAULTS_V1: Record<string, RoleDefaults> = {
  sales: { tools: ['contact.update', 'contact.set_stage', 'quote.create', 'conversation.handoff'], intents: [0, 1], prompt: 1 },
  cs: { tools: ['ticket.create', 'ticket.search', 'conversation.handoff', 'conversation.tag'], intents: [2, 3, 4], prompt: 0 },
  booking: { tools: ['appointment.find_slots', 'appointment.create', 'appointment.reschedule', 'conversation.handoff'], intents: [1, 5], prompt: 2 },
  marketing: { tools: ['campaign.suggest', 'segment.preview', 'contact.tag'], intents: [0, 1], prompt: 1 },
  accounting: { tools: ['invoice.create', 'conversation.handoff'], intents: [6], prompt: 0 },
  ops: { tools: ['conversation.assign', 'conversation.handoff', 'ticket.create'], intents: [2], prompt: 3 },
};

export const SALES_TOOLS_V2 = [
  'contact.search', 'contact.get', 'contact.update', 'contact.set_stage',
  'product.search', 'product.get',
  'quote.search', 'quote.get', 'quote.create', 'quote.send', 'quote.mark_accepted', 'quote.mark_rejected',
  'order.search', 'order.get', 'order.create',
  'appointment.list', 'appointment.get', 'appointment.find_slots', 'appointment.create', 'appointment.reschedule', 'appointment.cancel',
  'ticket.search', 'ticket.create',
  'message.send', 'conversation.handoff',
];

export const BOOKING_TOOLS_V2 = ['contact.search', 'contact.get', 'appointment.list', 'appointment.get', 'appointment.find_slots', 'appointment.create', 'appointment.reschedule', 'appointment.cancel', 'message.send', 'conversation.handoff'];

export const ROLE_DEFAULTS_V2: Record<string, RoleDefaults> = {
  ...ROLE_DEFAULTS_V1,
  sales: { ...ROLE_DEFAULTS_V1.sales!, tools: SALES_TOOLS_V2 },
  booking: { ...ROLE_DEFAULTS_V1.booking!, tools: BOOKING_TOOLS_V2 },
};

/** Rev 3: bộ Sales rev 2 giữ nguyên thứ tự + tồn kho và xin sửa báo giá (không thêm tool tiền / xoá). */
export const SALES_TOOLS_V3 = [...SALES_TOOLS_V2.slice(0, 6), 'stock.get', ...SALES_TOOLS_V2.slice(6, 12), 'quote.request_revision', ...SALES_TOOLS_V2.slice(12)];

export const ROLE_DEFAULTS_V3: Record<string, RoleDefaults> = { ...ROLE_DEFAULTS_V2, sales: { ...ROLE_DEFAULTS_V2.sales!, tools: SALES_TOOLS_V3 } };

/** Bộ mặc định của bản hiện hành (seed / nâng / xem trước). */
export const ROLE_DEFAULTS = ROLE_DEFAULTS_V3;

/** Id không tồn tại / không cấp được cho agent trong bộ mặc định — phải rỗng. */
export function invalidTemplateTools(): string[] {
  const ok = new Set(registry.filter(isAgentGrantable).map((a) => a.id));
  return [...new Set(Object.values(ROLE_DEFAULTS).flatMap((d) => d.tools))].filter((id) => !ok.has(id));
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

export type TemplateUpgrade = 'upgraded' | 'customized' | 'current';

/**
 * Quyết định nâng một dòng `agent_template`: đã rev hiện tại → current; tool khác bản dựng sẵn của MỌI rev trước của vai trò (đã bị quản
 * trị sửa) → customized (giữ nguyên, chờ người xem trước thay thế); còn lại → upgraded với tool rev hiện tại (giữ các khoá khác).
 */
export function planUpgrade(role: string, defaults: unknown): { kind: TemplateUpgrade; next?: Record<string, unknown> } {
  const d = (defaults ?? {}) as { tools?: string[]; revision?: number };
  if ((d.revision ?? 1) >= TEMPLATE_REVISION) return { kind: 'current' };
  const pristine = [ROLE_DEFAULTS_V1, ROLE_DEFAULTS_V2].map((r) => (r[role] ?? r.ops!).tools);
  if (d.tools && !pristine.some((t) => sameSet(d.tools!, t))) return { kind: 'customized' };
  return { kind: 'upgraded', next: { ...d, tools: (ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.ops!).tools, revision: TEMPLATE_REVISION } };
}

/** Xem trước thay thế cho mẫu đã sửa: tool thêm / bớt nếu quản trị chọn dùng bộ rev hiện tại. */
export function replacementPreview(role: string, defaults: unknown) {
  const cur = ((defaults ?? {}) as { tools?: string[] }).tools ?? [];
  const next = (ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.ops!).tools;
  return { add: next.filter((t) => !cur.includes(t)), remove: cur.filter((t) => !next.includes(t)), revision: TEMPLATE_REVISION };
}
