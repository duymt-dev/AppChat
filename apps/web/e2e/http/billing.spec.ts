// TIP-010 AC10 — E2E chế độ http (pnpm e2e:http): Ví › Nạp credit → hoá đơn + VietQR thật từ backend; giả webhook ngân hàng nền tảng
// (/hooks/payments/mock, HMAC cùng khoá API) → hộp thanh toán tự chuyển "Thanh toán thành công" (poll), số dư ví tăng; gói credit
// khác → "Tôi đã chuyển khoản" → "Đang chờ xác nhận".
import { createHmac } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const API = process.env.API_URL ?? 'http://localhost:4117';
const KEY = process.env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev';
const ACCOUNT = process.env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999';

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

const openPack = async (page: Page, key: string) => {
  await page.getByTestId('st-wal-topup').click();
  await page.getByTestId(`credit-pack-${key}`).click();
  return page.getByTestId('checkout-modal');
};

test.describe('gói & ví (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('nạp credit qua VietQR → webhook ngân hàng → thành công + số dư tăng; báo chuyển khoản → chờ xác nhận', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'bill');
    await page.goto('/settings/wallet');
    await expect(page.getByTestId('st-wal-balance')).toContainText('10.000');

    const co = await openPack(page, 'credit_1000');
    await expect(co.getByTestId('checkout-amount')).toHaveText(/1\.000\.000/);
    const content = (await co.getByTestId('checkout-content').textContent())!.trim();
    expect(content).toMatch(/^APPCHAT INV\d{8,}$/);
    expect(await bankPays('1000000', `MBVCB ${content} chuyen khoan`)).toBe(1);
    await expect(co.getByTestId('checkout-done')).toBeVisible({ timeout: 15_000 });
    await co.getByRole('button', { name: 'Hoàn tất' }).click();
    await expect(page.getByTestId('st-wal-balance')).toContainText('11.050');

    const co2 = await openPack(page, 'credit_500');
    await co2.getByTestId('checkout-paid').click();
    await expect(co2.getByTestId('checkout-review')).toBeVisible();
  });
});
