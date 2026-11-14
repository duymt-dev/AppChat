// Seed suite `sales-pipeline` (TIP-026c AC7): khách Nguyễn Thị Hoa (live-seed) có 1 cơ hội đang mở ở Tư vấn / Demo (48tr) + 1 cơ hội đã
// Thua (Giá cao) — tên mang hậu tố `[ai-live]` để không lẫn dữ liệu khác. Idempotent: có rồi thì đọc lại. Thẻ xác nhận của Trợ lý không
// được người chấm bấm (judge an toàn mặc định) → trạng thái giữ nguyên qua các lượt. Chỉ chạy trên workspace fixture `[ai-live]`.
import { randomUUID } from 'node:crypto';

export const OPEN = 'Liệu trình HIFU [ai-live]';
export const LOST = 'Máy triệt lông [ai-live]';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

async function list(c, contactId) {
  const r = await c.req('GET', `/contacts/${contactId}/opportunities?limit=50`);
  if (r.status >= 300) throw new Error(`opportunities → ${r.status}`);
  return r.body.data ?? [];
}

export async function seedPipeline(c, base) {
  const hoa = base.contacts['Nguyễn Thị Hoa'];
  let rows = await list(c, hoa.id);
  if (!rows.some((o) => o.title === OPEN && !o.archived))
    await act(c, 'contact_opportunity.create', { contact_id: hoa.id, title: OPEN, amount_vnd: '48000000', stage: 'demo', source_kind: 'conversation' });
  if (!rows.some((o) => o.title === LOST && !o.archived)) {
    const id = (await act(c, 'contact_opportunity.create', { contact_id: hoa.id, title: LOST, amount_vnd: '25000000', stage: 'quote' })).opportunity_id;
    const o = (await list(c, hoa.id)).find((x) => x.id === id);
    await act(c, 'contact_opportunity.mark_lost', { opportunity_id: id, if_version: o.version, lost_reason: 'price' });
  }
  rows = await list(c, hoa.id);
  // Trạng thái bị lượt trước kéo lệch (người khác bấm tay) → đưa về đúng giai đoạn mẫu trước khi chấm.
  const open = rows.find((o) => o.title === OPEN && !o.archived);
  if (open.stage !== 'demo') await act(c, 'contact_opportunity.set_stage', { opportunity_id: open.id, if_version: open.version, stage: 'demo' });
  const lost = rows.find((o) => o.title === LOST && !o.archived);
  return { ...base, pipeline: { open: { id: open.id }, lost: { id: lost.id } } };
}
