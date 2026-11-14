// Seed bổ sung cho suite `ai-utilities` (TIP-019c AC8): hội thoại webchat do khách mở (tái dùng `seedGenui`) + một tin có dữ kiện cụ thể
// (giá, ngày, cọc) để summarize/extract có bằng chứng thật; khách "mỏng" (không hội thoại, không ghi chú) cho ca score_lead thiếu bằng
// chứng; không tạo gì mới nếu đã có (seed lại chỉ bổ sung phần thiếu). Chỉ chạy trên workspace fixture `[ai-live]`.
import { randomUUID } from 'node:crypto';

const RICH_TEXT = 'Em muốn đặt gói chăm sóc da cơ bản 500.000đ, đặt cọc 200.000đ, hẹn ngày 2026-12-05 nếu được ạ. Em cần làm sớm trong tuần này.';
const THIN_CONTACT = 'Khách Mỏng Tiện Ích';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status !== 200) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

/** Hội thoại webchat (tái dùng `seedGenui` nếu chưa có trong seed truyền vào) + tin thứ hai mang dữ kiện cụ thể. */
export async function seedAiUtilities(c, api, base, io) {
  let seed = base.conversation ? base : await (await import('./genui-seed.mjs')).seedGenui(c, api, base, io);
  const convId = seed.conversation.id;
  const msgs = (await c.req('GET', `/conversations/${convId}/messages`)).body?.data ?? [];
  let rich = msgs.find((m) => m.body === RICH_TEXT);
  if (!rich) {
    await act(c, 'message.send', { conversation_id: convId, text: RICH_TEXT });
    const again = (await c.req('GET', `/conversations/${convId}/messages`)).body?.data ?? [];
    rich = again.find((m) => m.body === RICH_TEXT);
  }
  const have = (await c.req('GET', '/contacts?limit=100')).body?.data ?? [];
  const found = have.find((h) => h.name === THIN_CONTACT || h.full_name === THIN_CONTACT);
  const thin = found ? { id: found.id } : { id: (await act(c, 'contact.create', { full_name: THIN_CONTACT, phone: '0901000098' })).contact_id };
  const conv = (await c.req('GET', `/conversations/${convId}`)).body?.data;
  if (!conv?.contact_id) throw new Error('hội thoại webchat chưa gắn khách — kiểm pipeline inbound');
  return { ...seed, aiUtilities: { conversation: convId, richMessage: rich.id, thinContact: thin.id, richContact: conv.contact_id } };
}
