// TIP-042c (http — pnpm e2e:http): watcher chỉ đọc trên backend thật (D32, rbac §5). Chủ sở hữu mua gói Team (webhook ngân hàng giả) → mời
// một Sales → Sales đăng ký bằng OTP + nhận lời mời → Chủ sở hữu tạo khách + báo giá (của mình) và thêm Sales làm NGƯỜI THEO DÕI. Sales thấy
// báo giá trong danh sách + mở drawer: đọc được (server trả 200, tải lại vẫn đọc từ DB); mọi ghi (sửa, bình luận, gửi) bị SERVER chặn 403 SCOPE_FORBIDDEN —
// không chỉ ẩn nút. Gỡ theo dõi → tải lại không còn thấy (404).
import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { freshEmail, mailMatch, onboarded, otpOf, spoofIp } from './support';

const API = process.env.API_URL ?? 'http://localhost:4117';
const KEY = process.env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev';
const ACCOUNT = process.env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999';

type Headers = Record<string, string>;

/** Phiên đang đăng nhập của page → header gọi API (refresh cookie → access token; workspace từ /session). */
async function auth(req: APIRequestContext): Promise<Headers> {
  const token = ((await (await req.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await req.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}

async function act(req: APIRequestContext, h: Headers, id: string, input: unknown) {
  const r = await req.post(`/api/v1/actions/${id}`, { headers: { ...h, 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  return { status: r.status(), body: (await r.json()) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function bankPays(amount: string, content: string) {
  const body = JSON.stringify({
    id: `e2e-${Date.now()}`,
    transactions: [{ external_id: `e2e-${Date.now()}-${Math.random()}`, account_number: ACCOUNT, amount, direction: 'in', content, occurred_at: new Date().toISOString() }],
  });
  const r = await fetch(`${API}/hooks/payments/mock`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mock-signature': createHmac('sha256', KEY).update(body).digest('hex') }, body });
  expect(r.status).toBe(200);
}

/** Người được mời: đăng ký bằng OTP (API) → trả access token. Thư console ghi đè theo người nhận nên đăng ký TRƯỚC khi mời. */
async function registerByOtp(page: Page, email: string): Promise<string> {
  await page.request.post('/api/v1/auth/otp/request', { data: { email, purpose: 'register', locale: 'vi' } });
  const v = await page.request.post('/api/v1/auth/otp/verify', { data: { email, code: await otpOf(email), purpose: 'register', locale: 'vi' } });
  expect(v.status()).toBe(200);
  return ((await v.json()) as { data: { access_token: string } }).data.access_token;
}

/** Nhận lời mời (link trong thư mời) → phiên của page ở workspace của Chủ sở hữu. */
async function acceptInvite(page: Page, email: string, token: string) {
  const invite = await mailMatch(email, /invite\?token=([^"<\s&]+)/);
  const a = await page.request.post('/api/v1/auth/invite/accept', { headers: { authorization: `Bearer ${token}` }, data: { token: decodeURIComponent(invite) } });
  expect(a.status(), await a.text()).toBe(200);
}

test.describe('scope bản ghi (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('watcher đọc báo giá của khách được theo dõi, mọi ghi bị server chặn; gỡ theo dõi → mất quyền đọc', async ({ page, browser }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'rscope');
    const owner = await auth(page.request);

    // Gói Team (5 người dùng) — hoá đơn nền tảng + webhook ngân hàng giả.
    const inv = await act(page.request, owner, 'billing.create_invoice', { kind: 'plan', item: 'team', period: 'month' });
    expect(inv.status, JSON.stringify(inv.body)).toBe(200);
    await bankPays(inv.body.data.result.amount, `MBVCB ${inv.body.data.result.transfer_code} chuyen khoan`);

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', baseURL: test.info().project.use.baseURL });
    const watcher = await ctx.newPage();
    await spoofIp(watcher);
    const email = freshEmail('watcher');
    const token = await registerByOtp(watcher, email);
    await expect.poll(async () => (await act(page.request, owner, 'member.invite', { email, role: 'sales' })).status, { timeout: 20_000 }).toBe(200);
    await acceptInvite(watcher, email, token);
    const w = await auth(watcher.request);
    const wid = ((await (await watcher.request.get('/api/v1/me', { headers: w })).json()) as { data: { user: { id: string } } }).data.user.id;

    // Chủ sở hữu: khách + báo giá của mình, thêm Sales làm người theo dõi.
    const contact = (await act(page.request, owner, 'contact.create', { full_name: 'Chị Theo Dõi', phone: `09${Date.now().toString().slice(-8)}` })).body.data.result.contact_id as string;
    const quote = await act(page.request, owner, 'quote.create', { contact_id: contact, items: [{ name: 'Gói chăm sóc', qty: 1, unit_price: '1000000', tax_rate: 0 }] });
    expect(quote.status, JSON.stringify(quote.body)).toBe(200);
    const qid = quote.body.data.result.quote_id as string;
    expect((await act(page.request, owner, 'contact.add_collaborator', { contact_id: contact, user_id: wid, role: 'watcher' })).status).toBe(200);

    // Watcher: drawer báo giá đọc được, tải lại vẫn đọc (DB, không cache client).
    await watcher.goto('/quotes');
    const row = watcher.locator(`[data-quote="${qid}"]`).first();
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.click();
    await expect(watcher.getByTestId('q-drawer')).toContainText(quote.body.data.result.code);
    await watcher.reload();
    await expect(watcher.locator(`[data-quote="${qid}"]`).first()).toBeVisible({ timeout: 30_000 });

    // Ghi: server chặn dù vai trò Sales có quote.create / quote.send.
    for (const [id, input] of [
      ['quote.update', { quote_id: qid, patch: { note: 'watcher sửa' } }],
      ['quote.comment', { quote_id: qid, text: 'watcher bình luận' }],
      ['quote.send', { quote_id: qid, channel: 'webchat' }],
      ['contact.update', { contact_id: contact, patch: { full_name: 'Đổi tên' } }],
    ] as const) {
      const r = await act(watcher.request, w, id, input);
      expect([r.status, r.body.error?.code], id).toEqual([403, 'SCOPE_FORBIDDEN']);
    }

    // Gỡ theo dõi → request kế tiếp không thấy (404, không lộ tồn tại).
    expect((await act(page.request, owner, 'contact.remove_collaborator', { contact_id: contact, user_id: wid })).status).toBe(200);
    expect((await watcher.request.get(`/api/v1/quotes/${qid}`, { headers: w })).status()).toBe(404);
    await watcher.reload();
    await expect(watcher.locator(`[data-quote="${qid}"]`)).toHaveCount(0, { timeout: 30_000 });
    await ctx.close();
  });
});
