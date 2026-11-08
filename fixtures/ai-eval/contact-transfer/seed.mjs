// Seed suite `contact-transfer` (TIP-015d AC7–AC10): Sales thật (scope own — người nhận) + mỗi lượt một bộ khách riêng theo khoá lượt
// (`tag`) do Owner phụ trách: khách chính có hội thoại mở + báo giá nháp (đếm chuyển kèm), hai khách cho ca hàng loạt. Báo giá có người tạo
// = Owner để chấm "người tạo / doanh số không đổi". Không đụng khách của live-seed.
import { randomUUID } from 'node:crypto';
import { seedChannelSales } from '../channel-seed.mjs';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

export async function seedTransfer(c, base, o) {
  const sales = await seedChannelSales(c, o);
  const me = (await sales.req('GET', '/me')).body?.data;
  const salesId = me?.user?.id ?? me?.id;
  if (!salesId) throw new Error('không đọc được id Sales');
  const salesName = me?.user?.name ?? me?.name ?? 'Sales ai-live';
  /** Bộ khách của một lượt: khách chính (báo giá nháp) + 2 khách hàng loạt. Tên chứa `tag` để model tìm đúng. */
  const fresh = async (tag) => {
    const mk = async (name, phone) => (await act(c, 'contact.create', { full_name: name, phone })).contact_id;
    const d = String(parseInt(tag, 36) % 1_000_000).padStart(6, '0');
    const main = await mk(`Võ Thanh Bình ${tag}`, `093${d}1`);
    const q = await act(c, 'quote.create', { contact_id: main, items: [{ name: 'Liệu trình da 10 buổi', qty: 1, unit_price: '5000000', tax_rate: 0 }] });
    const b1 = await mk(`Đặng Mỹ Linh ${tag}`, `093${d}2`);
    const b2 = await mk(`Hồ Quốc Huy ${tag}`, `093${d}3`);
    return { main, quote: q.quote_id, bulk: [b1, b2] };
  };
  return { ...base, ctransfer: { sales: salesId, salesName, fresh } };
}
