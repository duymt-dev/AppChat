// TIP-039 pha 3 — E2E chế độ http (pnpm e2e:http billing-lifecycle): Gói & thanh toán trên backend thật.
//   - Nâng cấp › chọn Team → hộp xác nhận đọc giá server (`/billing/quote`, mua mới) → tạo mã → VietQR; webhook ngân hàng giả → gói Team
//     active (chỉ khi tiền về); Lịch sử hoá đơn › "Xem" tải PDF đề nghị thanh toán (application/pdf, đúng mã hoá đơn).
//   - Ví › lịch sử lọc server-side (vào / ra) + "Liên hệ" gói Enterprise → billing.contact_sales → báo đã nhận (không giả thành công).
// Gói hết hạn (popup + retain_until) dựng ở integration billing-quote.test.ts (cần tua đồng hồ server).
import { createHmac } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const API = process.env.API_URL ?? 'http://localhost:4117';
const KEY = process.env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev';
const ACCOUNT = process.env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999';

/** Phiên đang đăng nhập → header gọi API (refresh cookie → access token; workspace từ /session). */
async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}

async function bankPays(amount: string, content: string) {
  const body = JSON.stringify({
    id: `e2e-${Date.now()}`,
    transactions: [{ external_id: `e2e-${Date.now()}-${Math.random()}`, account_number: ACCOUNT, amount, direction: 'in', content, occurred_at: new Date().toISOString() }],
  });
  const r = await fetch(`${API}/hooks/payments/mock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-mock-signature': createHmac('sha256', KEY).update(body).digest('hex') },
    body,
  });
  expect(r.status).toBe(200);
  return ((await r.json()) as { data: { matched: number } }).data.matched;
}

test.describe('vòng đời gói (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('chọn gói → xác nhận giá server → QR → tiền về → gói active; PDF đề nghị thanh toán', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'life');
    await page.goto('/settings/billing?upgrade=1');
    const m = page.getByTestId('upgrade-modal');
    await m.getByTestId('seg-business').first().click();
    await m.getByTestId('plan-cta-team').click();
    const pc = page.getByTestId('plan-change-modal');
    await expect(pc.getByTestId('plan-change-mode')).toHaveAttribute('data-mode', 'new');
    await expect(pc.getByTestId('plan-change-amount')).toContainText('5.900.000');
    await pc.getByTestId('plan-change-modal-save').click();
    const co = page.getByTestId('checkout-modal');
    await expect(co.getByTestId('checkout-amount')).toHaveText(/5\.900\.000/);
    const content = (await co.getByTestId('checkout-content').textContent())!.trim();
    expect(await bankPays('5900000', `MBVCB ${content}`)).toBe(1);
    await expect(co.getByTestId('checkout-done')).toBeVisible({ timeout: 15_000 });
    await co.getByRole('button', { name: 'Hoàn tất' }).click();
    await expect(page.getByTestId('st-bill-plan')).toHaveText('Team');

    const row = page.locator('[data-invoice][data-status="paid"]').first();
    const id = await row.getAttribute('data-invoice');
    const code = (await row.locator('span').first().textContent())!.trim();
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByTestId(`st-bill-pdf-${id}`).click()]);
    await popup.close();
    // Cùng endpoint trình duyệt gọi: PDF thật, tên tệp theo mã hoá đơn, không cache dùng chung.
    const r = await page.request.get(`/api/v1/billing/invoices/${id}/pdf`, { headers: await auth(page) });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toBe('application/pdf');
    expect(r.headers()['content-disposition']).toContain(encodeURIComponent(`${code}.pdf`));
    expect(r.headers()['cache-control']).toBe('private, no-store');
  });

  test('Ví: lọc lịch sử phía server; Liên hệ Enterprise → đã nhận yêu cầu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'sales');
    await page.goto('/settings/wallet');
    await page.getByTestId('st-wal-tab-history').click();
    const led = page.getByTestId('st-wal-ledger');
    await expect(led.locator('[data-ledger]').first()).toBeVisible();
    await led.getByTestId('st-wal-ledger-filter').selectOption('out');
    await expect(led.getByTestId('st-wal-ledger-empty')).toBeVisible();
    await led.getByTestId('st-wal-ledger-filter').selectOption('in');
    await expect(led.locator('[data-ledger]').first()).toBeVisible();

    await page.goto('/settings/billing?upgrade=1');
    const m = page.getByTestId('upgrade-modal');
    await m.getByTestId('seg-business').first().click();
    await m.getByTestId('plan-cta-enterprise').click();
    const c = page.getByTestId('contact-sales-modal');
    await c.getByTestId('contact-phone').fill('0901 234 567');
    await c.getByTestId('contact-message').fill('Cần 40 người dùng, 10 kênh');
    await c.getByTestId('contact-sales-modal-save').click();
    await expect(c.getByTestId('contact-error')).toBeVisible();
    await c.getByTestId('contact-consent').check();
    await c.getByTestId('contact-sales-modal-save').click();
    await expect(c).toBeHidden();
    await expect(page.getByText('Đã nhận yêu cầu')).toBeVisible();
  });
});
