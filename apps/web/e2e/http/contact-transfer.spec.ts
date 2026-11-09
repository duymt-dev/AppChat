// TIP-015d P4 (http — pnpm e2e:http): chuyển phụ trách trên backend thật. Chủ sở hữu mua gói Team (webhook ngân hàng giả) → mời một Sales
// (đăng ký OTP + nhận lời mời) → tạo khách + báo giá nháp của mình → mở "Chuyển phụ trách" từ menu dòng, chọn Sales, kèm báo giá → khách
// sang Sales (tải lại vẫn đúng — DB), Sales thấy khách + báo giá trong danh sách của mình; báo giá: người báo giá (người tạo) giữ Chủ sở
// hữu, Phụ trách hiện tại = Sales. Chuông của Sales có thông báo chuyển phụ trách kèm tên khách (chiếu theo quyền hiện tại).
import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { freshEmail, mailMatch, onboarded, otpOf, spoofIp } from './support';

const API = process.env.API_URL ?? 'http://localhost:4117';
const KEY = process.env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev';
const ACCOUNT = process.env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999';
type Headers = Record<string, string>;

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
async function registerByOtp(page: Page, email: string): Promise<string> {
  await page.request.post('/api/v1/auth/otp/request', { data: { email, purpose: 'register', locale: 'vi' } });
  const v = await page.request.post('/api/v1/auth/otp/verify', { data: { email, code: await otpOf(email), purpose: 'register', locale: 'vi' } });
  expect(v.status()).toBe(200);
  return ((await v.json()) as { data: { access_token: string } }).data.access_token;
}

test.describe('chuyển phụ trách (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('chuyển khách + báo giá cho Sales: DB đổi thật, người tạo báo giá giữ nguyên, Sales thấy khách + thông báo', async ({ page, browser }) => {
    test.skip(isMobile(page), 'menu dòng chỉ desktop');
    await onboarded(page, 'ctransfer');
    const owner = await auth(page.request);
    const inv = await act(page.request, owner, 'billing.create_invoice', { kind: 'plan', item: 'team', period: 'month' });
    expect(inv.status, JSON.stringify(inv.body)).toBe(200);
    await bankPays(inv.body.data.result.amount, `MBVCB ${inv.body.data.result.transfer_code} chuyen khoan`);

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', baseURL: test.info().project.use.baseURL });
    const sales = await ctx.newPage();
    await spoofIp(sales);
    const email = freshEmail('ctsales');
    const token = await registerByOtp(sales, email);
    await expect.poll(async () => (await act(page.request, owner, 'member.invite', { email, name: 'Sales Nhận', role: 'sales' })).status, { timeout: 20_000 }).toBe(200);
    const link = await mailMatch(email, /invite\?token=([^"<\s&]+)/);
    expect((await sales.request.post('/api/v1/auth/invite/accept', { headers: { authorization: `Bearer ${token}` }, data: { token: decodeURIComponent(link) } })).status()).toBe(200);
    const s = await auth(sales.request);
    const sid = ((await (await sales.request.get('/api/v1/me', { headers: s })).json()) as { data: { user: { id: string } } }).data.user.id;

    const contact = (await act(page.request, owner, 'contact.create', { full_name: 'Chị Chuyển Giao', phone: `09${Date.now().toString().slice(-8)}` })).body.data.result.contact_id as string;
    const quote = await act(page.request, owner, 'quote.create', { contact_id: contact, items: [{ name: 'Gói chăm sóc', qty: 1, unit_price: '1000000', tax_rate: 0 }] });
    const qid = quote.body.data.result.quote_id as string;

    // UI: menu dòng → Chuyển phụ trách → Sales, kèm báo giá → hộp đóng, dòng hiện người mới.
    await page.goto('/customers');
    await page.locator(`[data-contact="${contact}"] .row-dots`).click();
    await page.getByRole('menuitem', { name: 'Chuyển phụ trách' }).click();
    await page.getByTestId('transfer-to').selectOption(sid);
    await page.getByTestId('transfer-submit').click();
    await expect(page.getByTestId('crm-transfer')).toHaveCount(0);
    await page.reload();
    // Tên hiển thị của người được mời = phần trước @ của email (đăng ký OTP không đặt tên) — dòng hiện người mới sau tải lại.
    await expect(page.locator(`[data-contact="${contact}"]`)).toContainText(email.split('@')[0]!);

    // DB: người phụ trách khách + người phụ trách báo giá = Sales; người tạo báo giá = Chủ sở hữu.
    const ec = ((await (await page.request.get(`/api/v1/contacts/${contact}/edit-context`, { headers: owner })).json()) as { data: { owner_user_id: string } }).data;
    expect(ec.owner_user_id).toBe(sid);
    const q = ((await (await page.request.get(`/api/v1/quotes/${qid}`, { headers: owner })).json()) as { data: { owner_user_id: string; assigned_user_id: string } }).data;
    expect(q.assigned_user_id).toBe(sid);
    expect(q.owner_user_id).not.toBe(sid);

    // Sales: khách trong danh sách của mình + thông báo chuyển phụ trách có tên khách.
    await sales.goto('/customers');
    await expect(sales.locator(`[data-contact="${contact}"]`)).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => JSON.stringify(((await (await sales.request.get('/api/v1/notifications', { headers: s })).json()) as { data: unknown[] }).data), { timeout: 30_000 })
      .toContain('Chị Chuyển Giao');
    await ctx.close();
  });
});
