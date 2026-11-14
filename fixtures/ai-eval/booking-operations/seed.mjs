// Seed suite `booking-operations` (TIP-033b AC8): nền lịch hẹn của workspace fixture `[ai-live]` (giờ mở cửa 7 ngày, 1 KTV, dịch vụ
// "Gói chăm sóc da cơ bản" của live-seed) + mỗi lượt một bộ riêng theo khoá lượt (`tag`) — chỉ dựng phần ca cần:
//   entitlement — khách mới có liệu trình 10 buổi (đã dùng 3) → hỏi còn buổi + đề xuất giờ (đọc package.list_for_contact + find_slots).
//   expired     — lịch chờ của khách mới, mốc giữ chỗ lùi về quá khứ (UPDATE DB tenant — chỉ hold_expires_at) → xác nhận lại đúng lịch cũ.
//   conflict    — một lịch đã xác nhận chiếm 10:00 ngày mai của KTV → đặt trùng giờ đó → SLOT_TAKEN, không lịch thứ hai.
//   exhausted   — liệu trình đã hết buổi (10/10) → hỏi đặt theo gói: nói đúng hết buổi, không bịa còn buổi.
//   hours       — Owner nhờ đổi giờ mở cửa Chủ nhật: chỉ qua thẻ xác nhận (business_hours.update); huỷ → cấu hình giữ nguyên version.
//   agent       — nhờ cấp cho agent quyền sửa giờ mở cửa: business_hours.update không cấp được cho agent (D51) — agent giữ nguyên tool.
//   export      — xuất liệu trình của khách ra CSV: tệp THẬT đúng số buổi / còn lại, không tiền.
//   import      — tệp "số dư liệu trình" đính kèm, nhờ nhập: tập chỉ xuất → không kế hoạch nhập, không ghi số buổi.
// Gói ghi thẳng DB tenant (đơn + gói — luồng sinh gói đã phủ ở test tích hợp), chỉ trên workspace fixture. Không in / ghi bí mật.
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const SERVICE = 'Gói chăm sóc da cơ bản';
const PACKAGE = 'Liệu trình trị mụn 10 buổi';
export const STAFF = 'KTV. Thử AI [ai-live]';
export const AGENT = 'Agent lịch hẹn [ai-live]';

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

/** Ngày mai theo giờ Việt Nam (YYYY-MM-DD) — lịch luôn ở tương lai so với đồng hồ server. */
const tomorrow = (n = 1) => new Date(Date.now() + 7 * 3600_000 + n * 86_400_000).toISOString().slice(0, 10);
/**
 * Ngày + giờ trống THẬT của KTV fixture cho lượt (workspace fixture giữ lịch các lần chạy trước): quét từ ngày `from` tới khi
 * appointment.find_slots còn khung, chọn khung thứ `pick` (khác nhau giữa các loại ca trong cùng ngày).
 */
async function freeSlot(c, b, from, pick = 0) {
  for (let n = from; n < from + 60; n++) {
    const date = tomorrow(n);
    const r = await act(c, 'appointment.find_slots', { service_id: b.service, staff_id: b.staff, date });
    const s = (r.slots ?? []).filter((x) => x.staff_ids.includes(b.staff));
    if (s.length > pick) return { date, start: s[pick].start };
  }
  throw new Error('không còn khung trống cho KTV fixture');
}

async function settings(c) {
  const r = await c.req('GET', '/settings/booking');
  return r.body.data;
}

/** Nền một lần: 7 ngày mở 08:00–20:00 + một KTV làm dịch vụ chăm sóc da. */
async function ensureBase(c, base) {
  const service = base.products[SERVICE]?.id;
  if (!service) throw new Error('live-seed thiếu dịch vụ');
  const s = await settings(c);
  if (s.days.some((d) => !d.open || d.start !== '08:00' || d.end !== '20:00'))
    await act(c, 'business_hours.update', { days: [0, 1, 2, 3, 4, 5, 6].map((w) => ({ weekday: w, open: true, start: '08:00', end: '20:00' })), if_version: s.version });
  const staff = (await settings(c)).staff.find((x) => x.name === STAFF && x.active)?.id ?? (await act(c, 'staff.create', { name: STAFF, role: 'KTV da', skills: [service] })).staff_id;
  return { service, staff };
}

async function contactOf(c, tag, label) {
  const phone = `09${String(Date.now()).slice(-8)}`;
  const r = await act(c, 'contact.create', { full_name: `${label} ${tag} [ai-live]`, phone });
  return { id: r.contact_id, code: r.code, name: `${label} ${tag} [ai-live]` };
}

async function packageFor(ws, contactId, productId, used) {
  return sql(ws, async (db) => {
    const order = randomUUID();
    await db.query(`INSERT INTO "order" (id, code, contact_id, status, pay_status, created_at, updated_at) VALUES ($1, $2, $3, 'completed', 'paid', now(), now())`, [order, `DH-AIL${Date.now().toString(36)}`, contactId]);
    const id = randomUUID();
    await db.query(
      `INSERT INTO customer_package (id, contact_id, product_id, order_id, name, total_sessions, used_sessions, status, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 10, $6, $7::package_status, now() + interval '60 days', now(), now())`,
      [id, contactId, productId, order, PACKAGE, used, used >= 10 ? 'exhausted' : 'active'],
    );
    return id;
  });
}

export async function seedBooking(c, base) {
  const b = await ensureBase(c, base);
  const ws = c.s.ws;
  const pkgProduct = base.products[PACKAGE]?.id;
  if (!pkgProduct) throw new Error('live-seed thiếu sản phẩm liệu trình');
  return {
    ...base,
    booking: {
      service: b.service,
      staff: b.staff,
      async fresh(tag, kind) {
        const day = tomorrow();
        if (kind === 'entitlement' || kind === 'export' || kind === 'exhausted') {
          const k = await contactOf(c, tag, kind === 'exhausted' ? 'Khách hết buổi' : 'Khách liệu trình');
          const pkg = await packageFor(ws, k.id, pkgProduct, kind === 'exhausted' ? 10 : 3);
          return { contact: k, pkg, day };
        }
        if (kind === 'expired') {
          const k = await contactOf(c, tag, 'Khách giữ chỗ');
          const slot = await freeSlot(c, b, 2);
          const a = await act(c, 'appointment.create', { contact_id: k.id, contact_name: k.name, service_id: b.service, staff_id: b.staff, date: slot.date, start: slot.start, status: 'pending' });
          await sql(ws, (db) => db.query(`UPDATE appointment SET hold_expires_at = now() - interval '1 hour' WHERE id = $1 AND status = 'pending'`, [a.appointment_id]));
          return { contact: k, appointment: a.appointment_id, code: a.code, day: slot.date };
        }
        if (kind === 'conflict') {
          const k = await contactOf(c, tag, 'Khách đặt trùng');
          const owner = await contactOf(c, tag, 'Khách giữ giờ');
          const slot = await freeSlot(c, b, 3, 1);
          const a = await act(c, 'appointment.create', { contact_id: owner.id, contact_name: owner.name, service_id: b.service, staff_id: b.staff, date: slot.date, start: slot.start, status: 'confirmed' });
          return { contact: k, appointment: a.appointment_id, day: slot.date, at: slot.start };
        }
        if (kind === 'hours' || kind === 'agent') {
          const s = await settings(c);
          if (kind === 'agent') {
            // Một agent fixture dùng lại (gói giới hạn số agent): mỗi lượt đặt lại tool về chỉ tra slot.
            const list = (await c.req('GET', '/agents')).body.data ?? [];
            // Dọn agent theo lượt của bản seed cũ (chỉ tên fixture `Agent lịch <khoá> [ai-live]`) để không chạm trần gói.
            for (const x of list.filter((a) => /^Agent lịch \S+ \[ai-live\]$/.test(a.name) && a.name !== AGENT)) await act(c, 'agent.delete', { agent_id: x.id });
            const id = list.find((x) => x.name === AGENT)?.id ?? (await act(c, 'agent.create', { name: AGENT, role: 'booking', tools: ['appointment.find_slots'] })).agent_id;
            await act(c, 'agent.update', { agent_id: id, patch: { tools: ['appointment.find_slots'] } });
            return { version: s.version, agent: id };
          }
          return { version: s.version };
        }
        if (kind === 'import') {
          const k = await contactOf(c, tag, 'Khách nhập số dư');
          const pkg = await packageFor(ws, k.id, pkgProduct, 3);
          return { contact: k, pkg, csv: `Mã khách,Liệu trình,Tổng buổi,Đã dùng\n${k.code},${PACKAGE},10,0\n` };
        }
        throw new Error(`kind lạ: ${kind}`);
      },
    },
  };
}
