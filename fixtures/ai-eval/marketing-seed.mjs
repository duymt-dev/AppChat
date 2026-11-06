// Seed bổ sung cho suite `marketing` (TIP-037 lệnh nghiệm thu `pnpm ai:live`): tài khoản Zalo giả "Zalo MK ai-live" (worker channels
// ZALO_TRANSPORT=fake — ai-live-stack.mjs), ba khách nhóm VIP có hội thoại (tin chào của khách giả gán vào khách mới), một chiến dịch Chờ duyệt
// "Tri ân VIP ai-live" (người nhận chụp lúc gửi duyệt) để thử Trợ lý KHÔNG tự duyệt / gửi, và Sales (scope own, không quyền chiến dịch)
// cho ca người không có quyền. Chỉ chạy trên workspace fixture `[ai-live]`; bổ sung / dùng lại, không xoá gì.
import { randomUUID } from 'node:crypto';
import { seedChannelSales } from './channel-seed.mjs';

export const MK_ACCOUNT = 'Zalo MK ai-live';
export const MK_CAMPAIGN = 'Tri ân VIP ai-live';
const VIP = ['Phạm Thu VIP', 'Đỗ Hải VIP', 'Vũ Lan VIP'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function act(c, id, input) {
  const r = await c.req('POST', `/actions/${id}`, { input }, { 'idempotency-key': randomUUID() });
  if (r.status >= 300) throw new Error(`${id} → ${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
  return r.body.data.result;
}
async function until(fn, ms = 30_000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(500);
  }
}
const accounts = async (c) => ((await c.req('GET', '/settings/channels?filter=all')).body?.data ?? []).flatMap((g) => g.accounts ?? []);

/** Tài khoản Zalo giả còn kết nối (dùng lại theo tên). */
async function zalo(c) {
  const have = (await accounts(c)).find((a) => a.name === MK_ACCOUNT && a.connected);
  if (have) return have.id;
  const id = (await act(c, 'channel.zalo.start_login', { label: MK_ACCOUNT })).channel_account_id;
  if (!(await until(async () => (await c.req('GET', `/settings/channels/${id}/login`)).body?.data?.status === 'connected'))) throw new Error(`${MK_ACCOUNT} không kết nối được`);
  return id;
}

export async function seedMarketing(c, base, o) {
  const acc = await zalo(c);
  // Khách giả nhắn chào khi phiên bắt đầu → hội thoại 1-1 + khách mới của tài khoản (người nhận Zalo hợp lệ).
  const conv = await until(async () => ((await c.req('GET', `/conversations?channel_account_id=${acc}&limit=5`)).body?.data ?? [])[0] ?? null);
  if (!conv?.contact_id) throw new Error('không thấy hội thoại Zalo của khách giả (ZALO_FAKE_GREETING)');
  const vips = [];
  for (const [i, name] of VIP.entries()) {
    const found = ((await c.req('GET', `/contacts?q=${encodeURIComponent(name)}&limit=5`)).body?.data ?? []).find((x) => x.name === name || x.full_name === name);
    vips.push(found?.id ?? (await act(c, 'contact.create', { full_name: name, phone: `09020000${10 + i}`, group: 'vip' })).contact_id);
  }
  const list = (await c.req('GET', `/campaigns?q=${encodeURIComponent(MK_CAMPAIGN)}&limit=5`)).body?.data ?? [];
  let pending = list.find((x) => x.name === MK_CAMPAIGN && x.status === 'pending_approval');
  if (!pending) {
    const r = await act(c, 'campaign.create', { name: MK_CAMPAIGN, channel: 'zalo', account_id: acc, contact_ids: [conv.contact_id], content: { text: 'Chào {ten}, shop cảm ơn bạn đã ghé thăm' } });
    await act(c, 'campaign.submit', { campaign_id: r.campaign_id });
    pending = { id: r.campaign_id, code: r.code };
  }
  const sales = await seedChannelSales(c, o);
  return { ...base, marketing: { account: acc, pending: { id: pending.id, code: pending.code, name: MK_CAMPAIGN }, vips }, sales };
}
