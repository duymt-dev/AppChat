// Seed suite `appointment-order` (TIP-033c AC8): KTV + dịch vụ RIÊNG của suite (giá 300.000, thuế 8% — mỗi loại ca một dịch vụ, đầu lượt
// đặt lại giá) + Sales thật (scope own) + một agent đã xuất bản chỉ đọc gợi ý. Mỗi lượt một bộ theo khoá lượt (`tag`):
//   eligible — lịch hoàn thành ngoài liệu trình, chưa có đơn → nhờ tạo đơn: thẻ order.create_from_appointment, đơn đúng giá hiện hành.
//   package  — lịch hoàn thành THUỘC liệu trình (gắn gói qua DB tenant) → không đơn (đã thu qua đơn gói).
//   linked   — lịch đã có đơn (tạo trước qua action thật) → không đơn thứ hai, nói đã có đơn.
//   limited  — Sales nhờ tạo đơn cho lịch của Owner (ngoài scope) → không đơn, không lộ giá / mã đơn.
//   changed  — người chấm đổi giá dịch vụ NGAY TRƯỚC khi bấm xác nhận → 409 stale, không đơn giá cũ (xem trước lại mới tạo được giá mới).
//   selected — chọn agent fixture (appointment.get + order_suggestions + product.search, không tạo đơn) hỏi giá buổi: đọc gợi ý, không tạo đơn.
// Gói ghi thẳng DB tenant (như booking-operations), chỉ trên workspace fixture `[ai-live]`. Không in / ghi bí mật.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { seedChannelSales } from './channel-seed.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
export const AO_STAFF = 'KTV. Tạo đơn [ai-live]';
export const AO_AGENT = 'Agent gợi ý đơn [ai-live]';
export const AO_PRICE = '300000';
const PACKAGE = 'Liệu trình trị mụn 10 buổi';

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

async function sql(ws, fn) {
  const { Client } = createRequire(join(ROOT, 'packages', 'db', 'package.json'))('pg');
  const db = new Client({ connectionString: tenantUrl(ws) });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

const day = (n) => new Date(Date.now() + 7 * 3600_000 + n * 86_400_000).toISOString().slice(0, 10);

/** Khung trống THẬT đầu tiên của KTV suite từ ngày mai (workspace fixture giữ lịch các lần chạy trước). */
async function freeSlot(c, service, staff) {
  for (let n = 1; n < 90; n++) {
    const r = await act(c, 'appointment.find_slots', { service_id: service, staff_id: staff, date: day(n) });
    const s = (r.slots ?? []).find((x) => x.staff_ids.includes(staff));
    if (s) return { date: day(n), start: s.start.slice(-5) };
  }
  throw new Error('không còn khung trống cho KTV suite');
}

async function settings(c) {
  return (await c.req('GET', '/settings/booking')).body.data;
}

/** Dịch vụ của loại ca: có thì đặt lại giá / thuế gốc (ca `changed` lượt trước đã đổi giá), chưa có thì tạo. */
async function serviceFor(c, kind) {
  const name = `Dịch vụ tạo đơn ${kind} [ai-live]`;
  const list = (await c.req('GET', `/products?q=${encodeURIComponent(name)}&limit=20`)).body?.data ?? [];
  const hit = list.find((p) => p.name === name);
  if (!hit) return { id: (await act(c, 'product.create', { name, type: 'service', price: AO_PRICE, tax_rate: 8, duration_min: 60 })).product_id, name };
  const p = (await c.req('GET', `/products/${hit.id}`)).body.data;
  if (String(p.price) !== AO_PRICE || Number(p.tax_rate) !== 8 || p.status !== 'active')
    await act(c, 'product.update', { product_id: hit.id, patch: { price: AO_PRICE, tax_rate: 8, status: 'active' }, if_version: p.version });
  return { id: hit.id, name };
}

async function packageFor(ws, contactId, productId) {
  return sql(ws, async (db) => {
    const order = randomUUID();
    await db.query(`INSERT INTO "order" (id, code, contact_id, status, pay_status, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'paid', now(), now())`, [order, `DH-AIO${Date.now().toString(36)}`, contactId]);
    const id = randomUUID();
    await db.query(
      `INSERT INTO customer_package (id, contact_id, product_id, order_id, name, total_sessions, used_sessions, status, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 10, 3, 'active'::package_status, now() + interval '60 days', now(), now())`,
      [id, contactId, productId, order, PACKAGE],
    );
    return id;
  });
}

/** Agent fixture chỉ đọc (gói giới hạn số agent — dùng lại theo tên, mỗi lượt đặt lại tool). */
async function readerAgent(c) {
  const list = (await c.req('GET', '/agents?limit=100')).body?.data ?? [];
  // Thẻ mang giá → agent cần quyền xem giá (catalog.view qua product.search), như agent Sales thật; thiếu thì bộ đọc bỏ thẻ (D51).
  const tools = ['appointment.get', 'appointment.order_suggestions', 'product.search'];
  const have = list.find((a) => a.name === AO_AGENT);
  if (!have) return (await act(c, 'agent.create_and_publish', { name: AO_AGENT, role: 'sales', persona: 'Tra cứu buổi hẹn đã xong và giá có thể tạo đơn — chỉ đọc, không tạo đơn', tools })).agent_id;
  const cur = (await c.req('GET', `/agents/${have.id}`)).body?.data;
  if ((cur?.tools ?? []).join() !== tools.join()) {
    await act(c, 'agent.update', { agent_id: have.id, patch: { tools } });
    await act(c, 'agent.publish', { agent_id: have.id });
  }
  return have.id;
}

export async function seedAppointmentOrder(c, base, o) {
  const ws = c.s.ws;
  const sales = await seedChannelSales(c, o);
  const s = await settings(c);
  if (s.days.some((d) => !d.open || d.start !== '08:00' || d.end !== '20:00'))
    await act(c, 'business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((w) => ({ weekday: w, open: true, start: '08:00', end: '20:00' })), if_version: s.version });
  // KTV không giới hạn kỹ năng (`skills` rỗng = mọi dịch vụ) — làm được dịch vụ riêng của từng loại ca.
  const staff = (await settings(c)).staff.find((x) => x.name === AO_STAFF && x.active)?.id ?? (await act(c, 'staff.create', { name: AO_STAFF, role: 'KTV' })).staff_id;
  const agent = await readerAgent(c);
  const pkgProduct = base.products?.[PACKAGE]?.id;
  if (!pkgProduct) throw new Error('live-seed thiếu sản phẩm liệu trình');

  async function fresh(tag, kind) {
    const svc = await serviceFor(c, kind);
    const name = `Khách tạo đơn ${tag} [ai-live]`;
    const k = await act(c, 'contact.create', { full_name: name, phone: `08${String(Date.now()).slice(-8)}` });
    const slot = await freeSlot(c, svc.id, staff);
    const a = await act(c, 'appointment.create', { contact_id: k.contact_id, contact_name: name, service_id: svc.id, staff_id: staff, date: slot.date, start: slot.start, status: 'confirmed' });
    await act(c, 'appointment.check_in', { appointment_id: a.appointment_id });
    await act(c, 'appointment.complete', { appointment_id: a.appointment_id });
    const out = { contact: { id: k.contact_id, name }, appointment: a.appointment_id, code: a.code, service: svc };
    if (kind === 'package') {
      const pkg = await packageFor(ws, k.contact_id, pkgProduct);
      await sql(ws, (db) => db.query(`UPDATE appointment SET package_id = $2 WHERE id = $1`, [a.appointment_id, pkg]));
      return { ...out, pkg };
    }
    if (kind === 'linked') {
      const r = await act(c, 'order.create_from_appointment', { appointment_id: a.appointment_id });
      return { ...out, order: { id: r.order_id, code: r.code } };
    }
    return out;
  }
  /** Ca `changed`: "người khác" đổi giá dịch vụ giữa lúc xem trước và lúc bấm xác nhận. */
  async function reprice(serviceId, price) {
    const p = (await c.req('GET', `/products/${serviceId}`)).body.data;
    await act(c, 'product.update', { product_id: serviceId, patch: { price }, if_version: p.version });
  }
  return { ...base, apptOrder: { fresh, reprice, sales, agent } };
}
