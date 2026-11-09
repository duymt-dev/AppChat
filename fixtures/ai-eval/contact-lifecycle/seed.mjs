// Seed suite `contact-lifecycle` (TIP-015f AC9): mỗi lượt một bộ riêng theo khoá lượt (`tag`) — chỉ dựng phần ca cần:
//   blocked   — khách có đơn mới (đang mở) → xoá bị chặn HAS_DEPENDENCIES.
//   allowed   — khách sạch → xoá được (thẻ xác nhận).
//   expired   — khách đã xoá, biên nhận lùi về 31 ngày trước (UPDATE trực tiếp DB tenant của workspace fixture — chỉ mốc thời gian, không
//               đổi thế hệ / trạng thái) → khôi phục 409 quá hạn.
//   conflict  — khách A đã xoá, khách B sống mang cùng SĐT → khôi phục A 409 (không lộ B).
//   denied    — Sales (không crm.delete) tạo khách của mình rồi nhờ Trợ lý xoá → không có action, khách còn nguyên.
//   inbound   — khách web mở hội thoại qua widget → xoá khách → khách nhắn tiếp (tin vẫn vào, khách giữ dấu đã xoá).
//   external  — đơn sàn đầu tạo khách người mua → xoá khách → sàn có đơn MỚI của người mua đó (chờ order.sync_now → biên nhận chặn).
//   export    — một khách sống + một khách đã xoá cùng khoá → tệp xuất thật chỉ có khách sống.
// Chỉ chạy trên workspace fixture `[ai-live]`. Không in / ghi bí mật (URL DB đọc từ .env máy dev, chỉ dùng trong tiến trình).
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { seedChannelSales } from '../channel-seed.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
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

/** Lùi mốc xoá của khách về 31 ngày trước (biên nhận + khách) — hết hạn khôi phục thật theo đồng hồ server. */
async function backdate(ws, contactId) {
  const { Client } = createRequire(join(ROOT, 'packages', 'db', 'package.json'))('pg');
  const db = new Client({ connectionString: tenantUrl(ws) });
  await db.connect();
  try {
    await db.query(`UPDATE contact SET deleted_at = now() - interval '31 days' WHERE id = $1 AND deleted_at IS NOT NULL`, [contactId]);
    await db.query(`UPDATE contact_lifecycle_receipt SET deleted_at = now() - interval '31 days', restore_until = now() - interval '1 day' WHERE contact_id = $1 AND state = 'deleted'`, [contactId]);
  } finally {
    await db.end();
  }
}

/** Khách web nhắn qua widget (socket `/widget`) — mỗi lượt một khách mới (không visitor_token). */
async function visitorSays(api, key, io, name, phone) {
  const origin = new URL(api).origin;
  const s = io(`${origin}/widget`, { auth: { public_key: key }, extraHeaders: { origin }, transports: ['websocket'], reconnection: false });
  const call = (ev, p) => new Promise((ok, no) => s.timeout(10_000).emit(ev, p, (err, r) => (err ? no(err) : r?.error ? no(new Error(JSON.stringify(r.error))) : ok(r.data))));
  await new Promise((ok, no) => (s.once('connect', ok), s.once('connect_error', no)));
  await call('visitor.hello', { name, phone, locale: 'vi' });
  return {
    say: async (text) => call('message.send', { client_id: `ail${Date.now()}${Math.random().toString(36).slice(2, 6)}`, text }),
    close: () => s.close(),
  };
}

async function until(fn, ms = 20_000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(500);
  }
}

export async function seedLifecycle(c, base, o) {
  const api = o.api;
  const sales = await seedChannelSales(c, o);
  const ws = c.s.ws;
  const phoneOf = (tag, n) => `096${String(parseInt(tag, 36) % 1_000_000).padStart(6, '0')}${n}`;
  const mk = async (cl, name, phone) => (await act(cl, 'contact.create', { full_name: name, phone })).contact_id;

  /** Bộ của một lượt theo loại ca. Tên khách chứa `tag` để model tìm đúng. */
  const fresh = async (tag, kind) => {
    const name = `Lâm Ngọc Diệp ${tag}`;
    const phone = phoneOf(tag, 1);
    switch (kind) {
      case 'blocked': {
        const id = await mk(c, name, phone);
        await act(c, 'order.create', { contact_id: id, items: [{ name: 'Liệu trình da 5 buổi', qty: 1, unit_price: '3000000', tax_rate: 0 }] });
        return { name, id };
      }
      case 'allowed':
        return { name, id: await mk(c, name, phone) };
      case 'expired': {
        const id = await mk(c, name, phone);
        await act(c, 'contact.delete', { contact_id: id });
        await backdate(ws, id);
        return { name, id };
      }
      case 'conflict': {
        const id = await mk(c, name, phone);
        await act(c, 'contact.delete', { contact_id: id });
        const other = `Tạ Minh Khoa ${tag}`;
        return { name, id, other, otherId: await mk(c, other, phone), otherPhone: phone };
      }
      case 'denied':
        return { name, id: await mk(sales, name, phone), actor: 'sales' };
      case 'inbound': {
        const w = (await c.req('GET', '/settings/widget')).body?.data;
        if (!w?.public_key || !w.enabled) await act(c, 'webchat.update_widget', { enabled: true, prechat: false });
        const key = w?.public_key ?? (await c.req('GET', '/settings/widget')).body?.data?.public_key;
        const v = await visitorSays(api, key, o.io, name, phone);
        try {
          await v.say('Chào shop, mình muốn hỏi lịch chăm sóc da tuần này');
          const conv = await until(async () => ((await c.req('GET', `/conversations?q=${encodeURIComponent(tag)}&limit=5`)).body?.data ?? []).find((x) => x.contact_id) ?? null);
          if (!conv) throw new Error('không thấy hội thoại webchat của khách — kiểm worker ROLE=channels');
          await act(c, 'contact.delete', { contact_id: conv.contact_id });
          await v.say(`Mình nhắn lại nè, mã ${tag}`);
          const marked = await until(async () => {
            const r = (await c.req('GET', `/conversations/${conv.id}`)).body?.data;
            return r?.contact_deleted && JSON.stringify((await c.req('GET', `/conversations/${conv.id}/messages?limit=5`)).body).includes(tag) ? r : null;
          });
          if (!marked) throw new Error('tin sau khi xoá chưa vào / chưa có dấu khách đã xoá');
          return { name, id: conv.contact_id, conversation: conv.id };
        } finally {
          v.close();
        }
      }
      case 'external': {
        const buyer = `Khách sàn Diệp ${tag}`;
        const at = () => new Date().toISOString();
        const ext = (id, status, paid, t) => ({ external_id: id, platform: 'shopee', platform_status: status, buyer: { id: `buyer-${tag}`, name: buyer }, lines: [{ sku: `SKU-${tag}`, name: 'Serum B5', qty: 1, unit_price: '450000' }], total: '450000', paid, created_at: t, updated_at: t });
        const first = ext(`MPD-${tag}-1`, 'COMPLETED', true, at());
        const fields = (orders) => ({ api_key: `ail-${tag}`, shop_id: 'ai-live', orders: JSON.stringify(orders) });
        await act(c, 'integration.connect', { provider: 'mock_marketplace', mode: 'sandbox', fields: fields([first]) });
        await act(c, 'order.sync_now', {});
        const mp = ((await c.req('GET', `/orders?q=${encodeURIComponent(buyer)}&source=marketplace&limit=5`)).body?.data ?? [])[0];
        if (!mp?.contact_id) throw new Error('không thấy đơn sàn đầu sau order.sync_now');
        await act(c, 'contact.delete', { contact_id: mp.contact_id });
        await sleep(1100);
        const second = ext(`MPD-${tag}-2`, 'UNPAID', false, at());
        await act(c, 'integration.connect', { provider: 'mock_marketplace', mode: 'sandbox', fields: fields([first, second]) });
        return { name: buyer, id: mp.contact_id, external: second.external_id };
      }
      case 'export': {
        const id = await mk(c, name, phone);
        const gone = `Lâm Ngọc Diệp cũ ${tag}`;
        const goneId = await mk(c, gone, phoneOf(tag, 2));
        await act(c, 'contact.delete', { contact_id: goneId });
        return { name, id, gone, goneId };
      }
    }
    throw new Error(`loại ca không rõ: ${kind}`);
  };
  return { ...base, lifecycle: { fresh, sales } };
}
