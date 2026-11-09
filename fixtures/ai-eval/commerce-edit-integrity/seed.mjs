// Seed suite `commerce-edit-integrity` (TIP-032c AC9): Sales thật (scope own) + mỗi lượt một bộ riêng theo khoá lượt (`tag`) do Owner tạo:
// khách thường có đơn mới + hợp đồng nháp (người tạo = Owner), một đơn sàn thật qua kết nối sàn thử nghiệm (`mock_marketplace`, sandbox —
// đơn nhập bằng order.sync_now, khoá dòng). Không đụng khách của live-seed. Không ghi bí mật ra tệp (api_key ngẫu nhiên mỗi lượt).
import { randomUUID } from 'node:crypto';
import { seedChannelSales } from '../channel-seed.mjs';

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

const nameOf = (me, dflt) => me?.user?.name ?? me?.name ?? dflt;

export async function seedCommerceEdit(c, base, o) {
  const sales = await seedChannelSales(c, o);
  const sme = (await sales.req('GET', '/me')).body?.data;
  const salesId = sme?.user?.id ?? sme?.id;
  if (!salesId) throw new Error('không đọc được id Sales');
  const ome = (await c.req('GET', '/me')).body?.data;
  const ownerId = ome?.user?.id ?? ome?.id;
  /** Bộ của một lượt. Tên khách chứa `tag` để model tìm đúng; mã đơn / hợp đồng đưa thẳng vào câu hỏi. */
  const fresh = async (tag) => {
    const d = String(parseInt(tag, 36) % 1_000_000).padStart(6, '0');
    const customer = `Phan Thu Hà ${tag}`;
    const contact = (await act(c, 'contact.create', { full_name: customer, phone: `094${d}1` })).contact_id;
    const order = (await act(c, 'order.create', { contact_id: contact, items: [{ name: 'Liệu trình da 10 buổi', qty: 1, unit_price: '5000000', tax_rate: 0 }] })).order_id;
    const contract = (await act(c, 'contract.create', { contact_id: contact, kind: 'service', title: `Gói chăm sóc ${tag}`, value: '24000000' })).contract_id;
    const buyer = `Khách sàn ${tag}`;
    const now = new Date().toISOString();
    const ext = { external_id: `MP-${tag}`, platform: 'shopee', platform_status: 'UNPAID', buyer: { id: `buyer-${tag}`, name: buyer }, lines: [{ sku: `SKU-${tag}`, name: 'Serum B5', qty: 2, unit_price: '350000' }], total: '700000', paid: false, created_at: now, updated_at: now };
    await act(c, 'integration.connect', { provider: 'mock_marketplace', mode: 'sandbox', fields: { api_key: randomUUID(), shop_id: 'ai-live', orders: JSON.stringify([ext]) } });
    await act(c, 'order.sync_now', {});
    const mp = ((await c.req('GET', `/orders?q=${encodeURIComponent(buyer)}&source=marketplace&limit=5`)).body?.data ?? [])[0];
    if (!mp) throw new Error('không thấy đơn sàn sau order.sync_now');
    const code = async (path) => (await c.req('GET', path)).body?.data?.code;
    return { customer, contact, order, orderCode: await code(`/orders/${order}`), contract, contractCode: await code(`/contracts/${contract}`), mpOrder: mp.id, mpCode: mp.code };
  };
  return { ...base, cedit: { owner: ownerId, ownerName: nameOf(ome, 'Owner'), sales: salesId, salesName: nameOf(sme, 'Sales ai-live'), fresh } };
}
