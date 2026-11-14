// Mock Cơ hội / Sales Pipeline (TIP-026c) — cùng hợp đồng server: 7 giai đoạn xác suất cố định (bảng hằng @appchat/shared), dự báo tính ở
// đây như server, thẻ 360° (bước tiếp theo theo luật, gợi ý AI đã lưu), drawer (chuỗi chứng từ + lịch sử), GET /contacts/:id/opportunities
// + /opportunities/:id, action create / update / archive / set_stage / mark_lost / reopen / set_owner / list / get. Tiền: không có quote.view
// → VẮNG + amount_hidden; ghi tiền thiếu quote.create → 403. `probability` / `quote_id` → 422 field_removed. Thuần — customers.ts nối khách.
import { ApiRequestError, OPPORTUNITY_PROBABILITY, authzForRole, can, forecastOf, opportunityRank, type OpenOpportunitySummaryDto, type OpportunityCardDto, type OpportunityDetailDto, type OpportunityItemDto, type OpportunityStage, type PermissionKey, type SystemRole } from '@appchat/shared';

export type Opp = Omit<OpportunityItemDto, 'amount_hidden' | 'forecast_vnd' | 'probability'> & { amount_vnd: string | null };
export type OppEvent = { id: string; opportunity_id: string; kind: string; from: string | null; to: string | null; params: Record<string, unknown>; at: string };
/** Chứng từ của cơ hội trong mock (mã thật của fixture báo giá / đơn khi có). */
export type OppDoc = { opportunity_id: string; step: 'quote' | 'contract' | 'order' | 'invoice'; id: string; code: string; status: string; amount_vnd: string };
export interface OppStore {
  opps: Opp[];
  events: OppEvent[];
  docs: OppDoc[];
}

const ME = 'u_tram';
const NAMES: Record<string, string> = { u_tram: 'Trâm', u_minh: 'Minh', u_huong: 'Hương' };
const d = (s: string) => `2026-06-${s}`;
const base = (o: Partial<Opp> & Pick<Opp, 'id' | 'contact_id' | 'title' | 'stage'>): Opp => ({
  need: '',
  amount_vnd: null,
  expected_close_date: null,
  owner: { id: ME, name: NAMES[ME]! },
  source_kind: 'manual',
  lost_reason: null,
  items: [],
  closed_at: null,
  stage_changed_at: d('02T03:40:00.000Z'),
  archived: false,
  updated_at: d('02T03:40:00.000Z'),
  version: 1,
  ...o,
});

/** Seed = prototype L2386 (chị Lan: HIFU đang Tư vấn / Demo 48tr; máy triệt lông Thua — Giá cao; chăm sóc da Đã mua). */
export const seedOpportunities = (): OppStore => ({
  opps: [
    base({ id: 'op_lan_1', contact_id: 'ct_lan', title: 'Liệu trình HIFU + Combo da', need: 'Khách cần liệu trình HIFU + combo da cho Shop Bé Na; ngân sách 20–50 triệu; ưu tiên demo trong tuần này.', amount_vnd: '48000000', stage: 'demo', expected_close_date: '2026-06-15', source_kind: 'conversation', items: [{ product_id: null, name: 'HIFU', qty: 1 }, { product_id: null, name: 'Combo da', qty: 2 }] }),
    base({ id: 'op_lan_2', contact_id: 'ct_lan', title: 'Máy triệt lông', amount_vnd: '25000000', stage: 'lost', lost_reason: 'price', closed_at: '2025-08-12T03:00:00.000Z', updated_at: '2025-08-12T03:00:00.000Z', stage_changed_at: '2025-08-12T03:00:00.000Z' }),
    base({ id: 'op_lan_3', contact_id: 'ct_lan', title: 'Gói chăm sóc da 2025', amount_vnd: '12000000', stage: 'won', closed_at: '2025-03-28T03:00:00.000Z', updated_at: '2025-03-28T03:00:00.000Z', stage_changed_at: '2025-03-28T03:00:00.000Z' }),
    // Cột "Cơ hội đang mở" của bảng Khách hàng — prototype L10201.
    base({ id: 'op_1002_1', contact_id: 'kh_1002', title: 'Gói AI CSKH 12 tháng', amount_vnd: '60000000', stage: 'quote', owner: { id: 'u_minh', name: 'Minh' } }),
    base({ id: 'op_1002_2', contact_id: 'kh_1002', title: 'Đào tạo nhân viên', amount_vnd: '25000000', stage: 'qualified', owner: { id: 'u_minh', name: 'Minh' } }),
    base({ id: 'op_1004_1', contact_id: 'kh_1004', title: 'Chăm sóc da 3 tháng', amount_vnd: '30000000', stage: 'qualified' }),
    base({ id: 'op_1005_1', contact_id: 'kh_1005', title: 'Triển khai Call Center', amount_vnd: '60000000', stage: 'negotiation', owner: { id: 'u_minh', name: 'Minh' } }),
    base({ id: 'op_1007_1', contact_id: 'kh_1007', title: 'Gói triệt lông năm', amount_vnd: '18000000', stage: 'lead' }),
    base({ id: 'op_1008_1', contact_id: 'kh_1008', title: 'Combo trẻ hoá 5 buổi', amount_vnd: '40000000', stage: 'quote' }),
    base({ id: 'op_1010_1', contact_id: 'kh_1010', title: 'Gói chăm sóc VIP', amount_vnd: '22000000', stage: 'demo' }),
    base({ id: 'op_1012_1', contact_id: 'kh_1012', title: 'Dịch vụ AI 12 tháng', amount_vnd: '180000000', stage: 'negotiation', owner: { id: 'u_minh', name: 'Minh' } }),
  ],
  events: [
    { id: 'oe_1', opportunity_id: 'op_lan_1', kind: 'created', from: null, to: 'qualified', params: {}, at: '2026-04-18T03:00:00.000Z' },
    { id: 'oe_2', opportunity_id: 'op_lan_1', kind: 'stage', from: 'qualified', to: 'demo', params: {}, at: d('02T03:40:00.000Z') },
    { id: 'oe_3', opportunity_id: 'op_lan_1', kind: 'ai_suggested', from: 'demo', to: 'quote', params: { reason: 'buying_signal' }, at: d('02T04:00:00.000Z') },
    { id: 'oe_4', opportunity_id: 'op_lan_2', kind: 'lost', from: 'quote', to: 'lost', params: { reason: 'price' }, at: '2025-08-12T03:00:00.000Z' },
    { id: 'oe_5', opportunity_id: 'op_lan_3', kind: 'stage', from: 'negotiation', to: 'won', params: {}, at: '2025-03-28T03:00:00.000Z' },
  ],
  docs: [
    { opportunity_id: 'op_lan_2', step: 'quote', id: 'q_0211', code: 'BG-0211', status: 'rejected', amount_vnd: '25000000' },
    { opportunity_id: 'op_lan_3', step: 'quote', id: 'q_0380', code: 'BG-0380', status: 'accepted', amount_vnd: '12000000' },
    { opportunity_id: 'op_lan_3', step: 'order', id: 'o_1120', code: 'DH-1120', status: 'completed', amount_vnd: '12000000' },
    { opportunity_id: 'op_1002_1', step: 'quote', id: 'q_0398', code: 'BG-0398', status: 'viewed', amount_vnd: '60000000' },
    { opportunity_id: 'op_1008_1', step: 'quote', id: 'q_0402', code: 'BG-0402', status: 'sent', amount_vnd: '40000000' },
    { opportunity_id: 'op_1005_1', step: 'quote', id: 'q_0391', code: 'BG-0391', status: 'accepted', amount_vnd: '60000000' },
    { opportunity_id: 'op_1012_1', step: 'quote', id: 'q_0377', code: 'BG-0377', status: 'accepted', amount_vnd: '180000000' },
  ],
});

const err = (status: number, code: 'NOT_FOUND' | 'VALIDATION_FAILED' | 'STALE_VERSION' | 'FORBIDDEN' | 'CONFLICT' | 'INVALID_TRANSITION', fields?: Record<string, string>) => new ApiRequestError(status, { code, message: code, ...(fields ? { fields } : {}) });
const has = (role: SystemRole, p: string) => can(authzForRole(role, ME), p as PermissionKey);
const now = () => new Date().toISOString();
const isClosed = (s: OpportunityStage) => s === 'won' || s === 'lost';

export function itemDto(o: Opp, role: SystemRole): OpportunityItemDto {
  const { amount_vnd, ...rest } = o;
  const money = has(role, 'quote.view') ? { amount_vnd, forecast_vnd: forecastOf(amount_vnd === null ? null : BigInt(amount_vnd), o.stage) } : { amount_hidden: true };
  return { ...rest, contact_id: o.contact_id, ...money, probability: OPPORTUNITY_PROBABILITY[o.stage] };
}

const NEXT: Partial<Record<OpportunityStage, string>> = { lead: 'confirm_need', qualified: 'book_demo', demo: 'send_quote', quote: 'follow_quote', negotiation: 'create_contract_or_order' };
export function cardDto(s: OppStore, o: Opp, role: SystemRole): OpportunityCardDto {
  const q = has(role, 'quote.view') ? s.docs.filter((x) => x.opportunity_id === o.id && x.step === 'quote').at(-1) : undefined;
  const sug = s.events.filter((e) => e.opportunity_id === o.id && e.kind === 'ai_suggested' && e.at > o.stage_changed_at && e.to !== o.stage).at(-1);
  const key = NEXT[o.stage];
  return {
    ...itemDto(o, role),
    quote: q ? { id: q.id, code: q.code, status: q.status, viewed_at: null } : null,
    next_step: key ? { key: key === 'follow_quote' && !q ? 'send_quote' : key, params: q ? { code: q.code } : {}, source: 'rule' } : null,
    suggestion: !isClosed(o.stage) && sug?.to ? { id: sug.id, to_stage: sug.to as OpportunityStage, reason_key: String(sug.params.reason ?? 'ai'), created_at: sug.at } : null,
  };
}

const live = (s: OppStore, contactId: string) => s.opps.filter((o) => o.contact_id === contactId && !o.archived).sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id));
export const oppList = (s: OppStore, contactId: string) => live(s, contactId);
/** Cơ hội hiện hành của thẻ 360°: mở mới nhất, không có thì mới nhất đã đóng. */
export const currentOpp = (s: OppStore, contactId: string) => {
  const all = live(s, contactId);
  return all.find((o) => !isClosed(o.stage)) ?? all[0] ?? null;
};

export function openSummaryOf(s: OppStore, role: SystemRole, contactId: string): OpenOpportunitySummaryDto | undefined {
  const open = live(s, contactId).filter((o) => !isClosed(o.stage));
  if (!open.length) return undefined;
  const top = open.reduce((b, o) => (opportunityRank(o.stage) > opportunityRank(b.stage) ? o : b), open[0]!).stage;
  const total = open.reduce((n, o) => n + BigInt(o.amount_vnd ?? '0'), 0n);
  return { count: open.length, top_stage: top, ...(has(role, 'quote.view') ? { amount_vnd: String(total) } : { amount_hidden: true }) };
}

export function detailDto(s: OppStore, o: Opp, role: SystemRole, canEdit: boolean): OpportunityDetailDto {
  const step = (k: OppDoc['step'], perm: string) => {
    const all = s.docs.filter((x) => x.opportunity_id === o.id && x.step === k);
    const seen = has(role, perm) ? all : [];
    return { hidden: all.length > 0 && !seen.length, docs: seen.map((x) => ({ id: x.id, code: x.code, status: x.status, ...(has(role, 'quote.view') ? { amount_vnd: x.amount_vnd } : {}) })) };
  };
  const inv = s.docs.filter((x) => x.opportunity_id === o.id && x.step === 'invoice');
  return {
    ...cardDto(s, o, role),
    chain: { quote: step('quote', 'quote.view'), contract: step('contract', 'contract.view'), order: step('order', 'order.view'), invoice: step('invoice', 'invoice.manage'), paid: has(role, 'invoice.manage') && inv.length ? { paid_vnd: '0', due_vnd: inv.reduce((n, x) => n + BigInt(x.amount_vnd), 0n).toString() } : null },
    events: s.events.filter((e) => e.opportunity_id === o.id).sort((a, b) => b.at.localeCompare(a.at)).map((e) => ({ id: e.id, kind: e.kind, from_stage: e.from, to_stage: e.to, ref: null, params: e.params, actor: { type: 'user', name: NAMES[ME]! }, created_at: e.at })),
    can_edit: canEdit,
  };
}

export const findOpp = (s: OppStore, id: string) => s.opps.find((o) => o.id === id) ?? null;
export const check = (cur: number, ifv?: number) => {
  if (ifv !== undefined && ifv !== cur) throw err(409, 'STALE_VERSION', { version: String(cur) });
};
export const removed = (i: Record<string, unknown>, prefix = '') => {
  for (const k of ['probability', 'quote_id']) if (k in i) throw err(422, 'VALIDATION_FAILED', { [`${prefix}${k}`]: 'field_removed' });
};
export const moneyGuard = (role: SystemRole, p: { amount_vnd?: string | null }) => {
  if (p.amount_vnd !== undefined && !has(role, 'quote.create')) throw err(403, 'FORBIDDEN', { amount_vnd: 'forbidden' });
};
export const liveDocs = (s: OppStore, id: string) => s.docs.some((x) => x.opportunity_id === id && ((x.step === 'order' && x.status !== 'cancelled') || (x.step === 'contract' && x.status === 'signed')));
export function move(s: OppStore, o: Opp, to: OpportunityStage, kind = 'stage', params: Record<string, unknown> = {}) {
  if (o.stage === to) return;
  s.events.push({ id: `oe_${s.events.length + 1}_${o.id}`, opportunity_id: o.id, kind, from: o.stage, to, params, at: now() });
  Object.assign(o, { stage: to, closed_at: isClosed(to) ? now() : null, stage_changed_at: now(), updated_at: now(), version: o.version + 1 });
}
export { err as oppErr, now as oppNow, ME as OPP_ME, NAMES as OPP_NAMES };
