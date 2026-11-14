// Seed suite `contact-merge` (TIP-015e AC8): mỗi lượt một bộ riêng theo khoá lượt (`tag`) — chỉ dựng phần ca cần. Khách trùng tạo qua
// action thật (cùng tên, khác SĐT; email ghi khác nhau để contact.create không chặn trùng) rồi gộp / sửa theo loại ca:
//   candidates — hai cặp trùng tên → Trợ lý liệt kê ứng viên (contact.duplicate_candidates), không gộp.
//   explain    — một cặp trùng → hỏi "vì sao trùng" → giải thích theo khoá luật (tên / email), không nói % xác suất.
//   selected   — ba khách cùng tên → chỉ gộp cặp người dùng chỉ định (A ← B), C còn nguyên.
//   acl        — bản phụ của Sales (khác người phụ trách) → gộp bị chặn acl_mismatch, không thêm quyền.
//   stale      — gộp xong rồi nhờ gộp lại bản phụ đã gộp → không gộp lại, nói đúng trạng thái.
//   undo       — gộp xong (qua API) rồi nhờ hoàn tác → hướng dẫn Nhật ký thao tác / không bịa đã hoàn tác.
//   history    — bản phụ có đơn → sau gộp hỏi đơn của khách chính → thấy đơn của bản phụ (chiếu theo họ), đơn giữ khách gốc.
//   file       — gộp xong rồi xuất đơn của khách chính → tệp thật có đơn của bản phụ.
// Chỉ chạy trên workspace fixture `[ai-live]`. Không in / ghi bí mật.
import { randomUUID } from 'node:crypto';
import { seedChannelSales } from '../channel-seed.mjs';

async function act(c, id, input, extra = {}) {
  const r = await c.req('POST', `/actions/${id}`, { input, ...extra }, { 'idempotency-key': randomUUID(), ...(extra.confirm_token ? { 'x-action-source': 'assistant' } : {}) });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data;
}
/** Gộp qua API như người dùng: preview (bulk → 202) rồi xác nhận bằng confirm_token. */
async function merge(c, primary, source) {
  const pv = await c.req('POST', '/actions/contact.merge', { input: { group_ids: [`${primary}~${source}`] } }, { 'idempotency-key': randomUUID() });
  if (pv.status !== 202) throw new Error(`merge preview → ${pv.status} ${JSON.stringify(pv.body).slice(0, 200)}`);
  return act(c, 'contact.merge', { group_ids: [`${primary}~${source}`] }, { confirm_token: pv.body.data.confirm_token });
}

export async function seedMerge(c, base, o) {
  const sales = await seedChannelSales(c, o);
  const phoneOf = (tag, n) => `097${String(parseInt(tag, 36) % 1_000_000).padStart(6, '0')}${n}`;
  const mk = async (cl, name, tag, n, email) => (await act(cl, 'contact.create', { full_name: name, phone: phoneOf(tag, n), ...(email ? { email } : {}) })).result.contact_id;
  const order = async (contact) => (await act(c, 'order.create', { contact_id: contact, items: [{ name: 'Liệu trình gội dưỡng sinh', qty: 1, unit_price: '1500000', tax_rate: 0 }] })).result;

  const fresh = async (tag, kind) => {
    const name = `Đoàn Thu Hà ${tag}`;
    switch (kind) {
      case 'candidates': {
        const other = `Phạm Gia Huy ${tag}`;
        return { name, other, ids: [await mk(c, name, tag, 1), await mk(c, name, tag, 2), await mk(c, other, tag, 3), await mk(c, other, tag, 4)] };
      }
      case 'explain':
        return { name, ids: [await mk(c, name, tag, 1), await mk(c, name, tag, 2)] };
      case 'selected': {
        const a = await mk(c, name, tag, 1);
        const b = await mk(c, name, tag, 2);
        const x = await mk(c, name, tag, 3);
        return { name, ids: [a, b, x], phones: [phoneOf(tag, 1), phoneOf(tag, 2), phoneOf(tag, 3)] };
      }
      case 'acl':
        return { name, ids: [await mk(c, name, tag, 1), await mk(sales, name, tag, 2)] };
      case 'stale': {
        const a = await mk(c, name, tag, 1);
        const b = await mk(c, name, tag, 2);
        await merge(c, a, b);
        return { name, ids: [a, b], phones: [phoneOf(tag, 1), phoneOf(tag, 2)] };
      }
      case 'undo': {
        const a = await mk(c, name, tag, 1);
        const b = await mk(c, name, tag, 2);
        await merge(c, a, b);
        return { name, ids: [a, b] };
      }
      case 'history':
      case 'file': {
        const a = await mk(c, name, tag, 1);
        const b = await mk(c, name, tag, 2);
        const o2 = await order(b);
        await merge(c, a, b);
        return { name, ids: [a, b], orderCode: o2.code, orderId: o2.order_id };
      }
    }
    throw new Error(`loại ca không rõ: ${kind}`);
  };
  return { ...base, merge: { fresh } };
}
