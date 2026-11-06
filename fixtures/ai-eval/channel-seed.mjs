// Seed suite `channel-vertical` (TIP-014b AC9) trên stack ai-live (worker channels `ZALO_TRANSPORT=fake` + `ZALO_FAKE_GREETING` +
// `ZALO_FAKE_UNKNOWN_TEXT` — ai-live-stack.mjs đặt khi chạy suite này):
//   - Tài khoản "Zalo ai-live" kết nối qua QR giả → khách giả nhắn tin chào → hội thoại + khách mới (định danh Zalo).
//   - Một tin gửi ra đúng chữ ZALO_FAKE_UNKNOWN_TEXT → kênh giả lỗi mạng SAU khi gọi → tin `unknown` (không rõ đã tới khách).
//   - Tài khoản "Zalo hết phiên ai-live": kết nối rồi bị Zalo đá phiên (tin `ZALO_FAKE_KICK_TEXT`) → `expired`, vẫn hiện ở danh sách kênh
//     (tài khoản đã ngắt bị ẩn khỏi Trợ lý — không phải ca "mất kết nối"). Ca kênh mất kết nối.
//   - Thành viên Sales (scope own) đăng nhập riêng — ca phạm vi bị thu hồi đọc báo giá của khách người khác. Gói trial chỉ 1 người dùng →
//     mua gói Team qua hoá đơn nền tảng + webhook ngân hàng giả (`/hooks/payments/mock`, HMAC khoá dev mặc định — như E2E billing).
// Chỉ chạy trên workspace fixture `[ai-live]`; bổ sung / dùng lại phần của mình, không xoá gì.
import { createHmac, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const CV_ACCOUNT = 'Zalo ai-live';
export const CV_DEAD_ACCOUNT = 'Zalo hết phiên ai-live';
export const CV_KICK_TEXT = 'ai-live: đá phiên tài khoản này';
export const CV_UNKNOWN_TEXT = 'Dạ shop gửi chị bảng giá gội đầu dưỡng sinh ạ';
export const CV_SALES_EMAIL = 'sales-channel@ai-live.appchat.test';

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

/** Kết nối một tài khoản Zalo giả (QR tự quét) — đã có cùng tên còn kết nối thì dùng lại. */
async function connect(c, label) {
  const have = (await accounts(c)).find((a) => a.name === label && a.connected);
  if (have) return have.id;
  const r = await act(c, 'channel.zalo.start_login', { label });
  const id = r.channel_account_id;
  if (!(await until(async () => (await c.req('GET', `/settings/channels/${id}/login`)).body?.data?.status === 'connected'))) throw new Error(`${label} không kết nối được`);
  return id;
}

async function otpFrom(mailDir, email) {
  const f = join(mailDir, `${email}.txt`);
  return until(() => (existsSync(f) ? ([...readFileSync(f, 'utf8').matchAll(/\b(\d{6})\b/g)].at(-1)?.[1] ?? null) : null), 15_000);
}

/** Gói Team (5 người dùng): hoá đơn gói → webhook ngân hàng giả khớp mã chuyển khoản → kích hoạt. Đã đủ chỗ thì bỏ qua. */
async function teamPlan(c, api) {
  const inv = await act(c, 'billing.create_invoice', { kind: 'plan', item: 'team', period: 'month' });
  const body = JSON.stringify({
    id: `ailive-${Date.now()}`,
    transactions: [{ external_id: `ailive-${randomUUID()}`, account_number: process.env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999', amount: inv.amount, direction: 'in', content: inv.transfer_code, occurred_at: new Date().toISOString() }],
  });
  const key = process.env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev';
  const r = await fetch(`${new URL(api).origin}/hooks/payments/mock`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mock-signature': createHmac('sha256', key).update(body).digest('hex') }, body });
  if (r.status !== 200) throw new Error(`webhook ngân hàng giả → ${r.status}`);
}

/** Sales scope own: mời → đăng ký bằng OTP (hộp thư console) → nhận lời mời. Trả client đã đăng nhập workspace. */
async function salesClient(c, o) {
  const { client: mk, mailDir, password } = o;
  const sales = mk(CV_SALES_EMAIL);
  let r = await sales.req('POST', '/auth/password/login', { email: CV_SALES_EMAIL, password, remember: true });
  if (r.status !== 200) {
    const invite = () => c.req('POST', '/actions/member.invite', { input: { email: CV_SALES_EMAIL, name: 'Sales ai-live', role: 'sales' } }, { 'idempotency-key': randomUUID() });
    let iv = await invite();
    if (iv.status === 402) {
      await teamPlan(c, o.api);
      iv = (await until(async () => {
        const x = await invite();
        return x.status === 402 ? null : x;
      }, 15_000)) ?? iv;
    }
    if (iv.status >= 300) throw new Error(`member.invite → ${iv.status} ${JSON.stringify(iv.body).slice(0, 200)}`);
    const link = await until(() => {
      const f = join(mailDir, `${CV_SALES_EMAIL}.txt`);
      return existsSync(f) ? (/token=([A-Za-z0-9_%-]{20,})/.exec(readFileSync(f, 'utf8'))?.[1] ?? null) : null;
    }, 15_000);
    if (!link) throw new Error('không thấy thư mời Sales');
    await sales.req('POST', '/auth/otp/request', { email: CV_SALES_EMAIL, purpose: 'register', locale: 'vi' });
    r = await sales.req('POST', '/auth/otp/verify', { email: CV_SALES_EMAIL, code: await otpFrom(mailDir, CV_SALES_EMAIL), purpose: 'register', locale: 'vi' });
    if (r.status !== 200) throw new Error(`Sales đăng ký lỗi ${r.status}`);
    sales.s.token = r.body.data.access_token;
    if (r.body.data.needs_password) await sales.req('POST', '/auth/password/set', { password });
    const a = await sales.req('POST', '/auth/invite/accept', { token: decodeURIComponent(link) });
    if (a.status >= 300) throw new Error(`Sales nhận lời mời lỗi ${a.status}`);
  } else sales.s.token = r.body.data.access_token;
  sales.s.ws = c.s.ws;
  return sales;
}

/** Sales scope own đã đăng nhập (dùng lại ở suite marketing — ca người không có quyền chiến dịch). */
export const seedChannelSales = (c, o) => salesClient(c, o);

export async function seedChannel(c, base, o) {
  const acc = await connect(c, CV_ACCOUNT);
  // Khách giả nhắn tin chào khi phiên bắt đầu → hội thoại Zalo mới của tài khoản.
  const conv = await until(async () => ((await c.req('GET', `/conversations?channel_account_id=${acc}&limit=5`)).body?.data ?? [])[0] ?? null);
  if (!conv) throw new Error('không thấy hội thoại Zalo của khách giả (ZALO_FAKE_GREETING)');
  // Tin gửi ra đúng chữ "mất mạng sau khi gọi" → unknown.
  const msgs = async () => (await c.req('GET', `/conversations/${conv.id}/messages`)).body?.data ?? [];
  if (!(await msgs()).some((m) => m.body === CV_UNKNOWN_TEXT)) await act(c, 'message.send', { conversation_id: conv.id, text: CV_UNKNOWN_TEXT });
  const sent = await until(async () => (await msgs()).find((m) => m.body === CV_UNKNOWN_TEXT && m.status === 'unknown') ?? null);
  if (!sent) throw new Error('tin gửi ra không về trạng thái unknown (ZALO_FAKE_UNKNOWN_TEXT)');

  if (!(await accounts(c)).some((a) => a.name === CV_DEAD_ACCOUNT && a.status === 'expired')) {
    const id = await connect(c, CV_DEAD_ACCOUNT);
    const dc = await until(async () => ((await c.req('GET', `/conversations?channel_account_id=${id}&limit=5`)).body?.data ?? [])[0] ?? null);
    if (!dc) throw new Error('không thấy hội thoại của tài khoản sẽ hết phiên');
    await act(c, 'message.send', { conversation_id: dc.id, text: CV_KICK_TEXT });
    if (!(await until(async () => (await accounts(c)).some((a) => a.id === id && a.status === 'expired')))) throw new Error('tài khoản không về expired (ZALO_FAKE_KICK_TEXT)');
  }
  const quote = (await c.req('GET', `/quotes/${base.quote.id}`)).body?.data;

  const sales = await salesClient(c, o);
  return {
    ...base,
    quote: { ...base.quote, total: quote?.total ?? null },
    channel: { account: acc, conversation: conv.id, contact: conv.contact_id, customer: conv.title, unknown_message: sent.id, unknown_text: CV_UNKNOWN_TEXT, dead_account: CV_DEAD_ACCOUNT },
    sales,
  };
}
