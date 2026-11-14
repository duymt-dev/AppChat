// Seed suite `record-ai-entrypoints` (TIP-023g): một bản ghi THẬT mỗi loại do Owner tạo qua action (báo giá / hợp đồng / đơn / lịch hẹn
// / ticket / đề nghị thanh toán / sản phẩm) + một việc follow (bảng `follow_up` — chỉ job hệ thống sinh, nên chèn thẳng như seed lịch
// hẹn chèn liệu trình) + Sales thật (sales own — báo giá của Owner phải 404). Người chấm đọc id từ đây; id thật là UUID (không `q_…`).
// Chỉ chạy trên workspace fixture `[ai-live]`. Không in / ghi bí mật.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { seedChannelSales } from './channel-seed.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const TAG = '[ai-live rec]';

async function act(c, id, input) {
  const key = randomUUID();
  let r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': key });
  if (r.status === 202 && r.body?.data?.confirm_token) r = await c.req('POST', `/actions/${id}`, { input, confirm_token: r.body.data.confirm_token }, { 'idempotency-key': key });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}

function tenantUrl(ws) {
  const env = existsSync(join(ROOT, '.env')) ? readFileSync(join(ROOT, '.env'), 'utf8') : '';
  const base = process.env.TENANT_DATABASE_URL ?? /^TENANT_DATABASE_URL=(.*)$/m.exec(env)?.[1]?.trim();
  if (!base) throw new Error('thiếu TENANT_DATABASE_URL');
  const u = new URL(base);
  u.pathname = `/ws_${ws.replace(/-/g, '').slice(-12).toLowerCase()}`;
  return u.toString();
}

async function followUp(ws, contactId) {
  const { Client } = createRequire(join(ROOT, 'packages', 'db', 'package.json'))('pg');
  const db = new Client({ connectionString: tenantUrl(ws) });
  await db.connect();
  try {
    const id = randomUUID();
    // Việc follow còn hiệu lực khi mốc nguồn = lần tương tác cuối của khách (job thay việc cũ khi có tương tác mới) — đặt mốc cả hai về
    // 8 ngày trước, SAU khi mọi chứng từ của khách đã tạo (tạo báo giá / đơn / ticket cũng là tương tác).
    await db.query(`UPDATE contact SET last_interaction_at = now() - interval '8 days' WHERE id = $1`, [contactId]);
    await db.query(`INSERT INTO follow_up (id, contact_id, source_key, source_at, due_at) SELECT $1, c.id, $3, c.last_interaction_at, c.last_interaction_at + interval '7 days' FROM contact c WHERE c.id = $2`, [id, contactId, `ai-live-rec:${id}`]);
    return id;
  } finally {
    await db.end();
  }
}

const tomorrow = (n) => new Date(Date.now() + 7 * 3600_000 + n * 86_400_000).toISOString().slice(0, 10);

async function appointment(c, contact, service) {
  let st = (await c.req('GET', '/settings/booking')).body.data;
  // Giờ mở cửa cố định như suite lịch hẹn (workspace fixture có thể đang đóng ngày) — không thì không có khung trống nào.
  if (st.days.some((d) => !d.open || d.start !== '08:00' || d.end !== '20:00')) {
    await act(c, 'business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((w) => ({ weekday: w, open: true, start: '08:00', end: '20:00' })), if_version: st.version });
    st = (await c.req('GET', '/settings/booking')).body.data;
  }
  // KTV làm dịch vụ (KTV của suite lịch hẹn nếu có; không thì tạo một KTV fixture — ca riêng trống = theo giờ mở cửa).
  const staff = (st.staff.find((x) => x.name === 'KTV. Thử AI [ai-live]' && x.active) ?? st.staff.find((x) => x.name === `KTV dịch vụ ${TAG}` && x.active && x.skills.includes(service)))?.id ?? (await act(c, 'staff.create', { name: `KTV dịch vụ ${TAG}`, role: 'KTV da', skills: [service] })).staff_id;
  for (let n = 3; n < 13; n++) {
    const date = tomorrow(n);
    await new Promise((r) => setTimeout(r, 700)); // giới hạn tốc độ action đọc
    const slots = ((await act(c, 'appointment.find_slots', { service_id: service, staff_id: staff, date })).slots ?? []).filter((x) => x.staff_ids.includes(staff));
    if (slots.length) return (await act(c, 'appointment.create', { contact_id: contact.id, contact_name: contact.name, service_id: service, staff_id: staff, date, start: slots[0].start, status: 'pending' })).appointment_id;
  }
  throw new Error('không còn khung trống cho KTV fixture');
}

export async function seedRecordAi(c, base, o) {
  const sales = await seedChannelSales(c, o);
  const stamp = Date.now().toString(36);
  const name = `Chị Thu Record ${stamp} ${TAG}`;
  const contact = { id: (await act(c, 'contact.create', { full_name: name, phone: `096${String(Date.now()).slice(-7)}` })).contact_id, name };
  const product = (await act(c, 'product.create', { name: `Gội đầu dưỡng sinh ${TAG}`, type: 'service', price: '200000', status: 'active' })).product_id;
  const p2 = (await act(c, 'product.create', { name: `Dầu gội thảo mộc ${TAG}`, type: 'physical', price: '150000', status: 'active' })).product_id;
  const p3 = (await act(c, 'product.create', { name: `Massage cổ vai gáy ${TAG}`, type: 'service', price: '300000', status: 'active' })).product_id;
  const item = { product_id: product, name: `Gội đầu dưỡng sinh ${TAG}`, qty: 1, unit_price: '200000', tax_rate: 8 };
  const quote = (await act(c, 'quote.create', { contact_id: contact.id, items: [item] })).quote_id;
  const contract = (await act(c, 'contract.create', { contact_id: contact.id, kind: 'service', title: `Liệu trình gội đầu ${TAG}`, value: '2000000', start_date: tomorrow(1), end_date: tomorrow(180) })).contract_id;
  const order = (await act(c, 'order.create', { contact_id: contact.id, items: [item] })).order_id;
  const invoice = (await act(c, 'invoice.create', { order_id: order, contact_id: contact.id, kind: 'full', amount: '216000' })).invoice_id;
  const ticket = (await act(c, 'ticket.create', { title: `Khách hỏi bảo hành ${TAG}`, contact_id: contact.id, channel: 'email', category: 'Khác', priority: 'high' })).ticket_id;
  // Dịch vụ có thời lượng của live-seed (như suite lịch hẹn) — sản phẩm vừa tạo không có `duration_min`.
  const service = base.products?.['Gói chăm sóc da cơ bản']?.id;
  if (!service) throw new Error('live-seed thiếu dịch vụ');
  const appt = await appointment(c, contact, service);
  const follow = await followUp(c.s.ws, contact.id);
  const productIds = ((await c.req('GET', '/products?limit=200')).body.data.items ?? (await c.req('GET', '/products?limit=200')).body.data).map((p) => p.id);
  for (const id of [product, p2, p3]) if (!productIds.includes(id)) productIds.push(id);
  return {
    ...base,
    recordAi: { sales, productIds, ids: { quote, contract, order, appointment: appt, follow_up: follow, ticket, invoice, product } },
  };
}
