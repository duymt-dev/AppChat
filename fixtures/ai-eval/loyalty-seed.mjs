// Seed bổ sung cho suite `loyalty` (TIP-036 AC9): khách Trần Văn Nam có đúng 1.250 điểm (điều chỉnh tay lý do khuyến mãi — một đường
// ghi qua action), một đơn 100.000đ đã xác nhận + đề nghị thanh toán toàn phần chưa thu (trần đổi điểm 50% = 500 điểm), và một agent CSKH
// đã xuất bản CHỈ có tool `loyalty.get_member` (không được cộng / trừ điểm — loyalty.adjust_points không agentGrantable). Chỉ chạy trên
// workspace fixture `[ai-live]` (live-seed.mjs đã chặn email / tên). Bổ sung phần thiếu, không xoá gì.
import { randomUUID } from 'node:crypto';

export const LY_POINTS = 1250;
export const LY_ORDER_TOTAL = '100000';
export const LY_AGENT = 'CSKH điểm ai-live';
const NAM = 'Trần Văn Nam';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status !== 200) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

/** Số dư đúng LY_POINTS (điều chỉnh phần chênh); đề nghị 100.000đ chưa thu của Nam; agent CSKH chỉ đọc điểm. */
export async function seedLoyalty(c, base) {
  const nam = base.contacts[NAM];
  const m = (await c.req('GET', `/loyalty/members/${nam.id}`)).body?.data;
  const delta = LY_POINTS - (m?.points ?? 0);
  if (delta !== 0) await act(c, 'loyalty.adjust_points', { contact_id: nam.id, delta, reason: 'promotion', note: 'ai-live seed' });

  const list = (await c.req('GET', '/invoices?limit=50')).body?.data ?? [];
  let inv = list.find((x) => x.contact_id === nam.id && x.amount === LY_ORDER_TOTAL && x.paid_amount === '0' && x.status !== 'void');
  if (!inv) {
    const o = await act(c, 'order.create', { contact_id: nam.id, items: [{ name: 'Gói thử điểm', qty: 1, unit_price: LY_ORDER_TOTAL, tax_rate: 0 }] });
    await act(c, 'order.confirm', { order_id: o.order_id });
    const i = await act(c, 'invoice.create', { order_id: o.order_id, contact_id: nam.id, kind: 'full', amount: LY_ORDER_TOTAL });
    inv = (await c.req('GET', `/invoices/${i.invoice_id}`)).body?.data;
  }

  const agents = (await c.req('GET', '/agents')).body?.data ?? [];
  let agent = agents.find((a) => a.name === LY_AGENT);
  if (!agent) {
    const r = await act(c, 'agent.create_and_publish', { name: LY_AGENT, role: 'cs', persona: 'Tra cứu điểm khách thân thiết', tools: ['loyalty.get_member'] });
    agent = { id: r.agent_id };
  }
  return { ...base, loyalty: { invoice: { id: inv.id, code: inv.code }, agent: { id: agent.id }, cap: Number(LY_ORDER_TOTAL) / 2 / 100 } };
}
