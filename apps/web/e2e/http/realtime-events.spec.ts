// TIP-006c AC1 (http — pnpm e2e:http realtime-events): số dư Credit cập nhật realtime, không F5. Tab A để màn Ví đứng yên (không mở hộp
// thanh toán → không poll); tab B cùng phiên mua gói credit → webhook ngân hàng giả ghi nhận → ví đổi → outbox `credits.changed` →
// Socket.IO → tab A làm mới khoá `billing` và hiện số dư mới.
import { createHmac } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const API = process.env.API_URL ?? 'http://localhost:4117';
const KEY = process.env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev';
const ACCOUNT = process.env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999';

async function bankPays(amount: string, content: string) {
  const body = JSON.stringify({
    id: `e2e-rt-${Date.now()}`,
    transactions: [{ external_id: `e2e-rt-${Date.now()}-${Math.random()}`, account_number: ACCOUNT, amount, direction: 'in', content, occurred_at: new Date().toISOString() }],
  });
  const r = await fetch(`${API}/hooks/payments/mock`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-mock-signature': createHmac('sha256', KEY).update(body).digest('hex') },
    body,
  });
  expect(r.status).toBe(200);
}

test.describe('realtime credits.changed (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('nạp Credit ở tab khác → màn Ví tab này cập nhật số dư không F5', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'rtcred');
    await page.goto('/settings/wallet');
    await expect(page.getByTestId('st-wal-balance')).toContainText('10.000');

    const buyer = await context.newPage();
    await buyer.goto('/settings/wallet');
    await buyer.getByTestId('st-wal-topup').click();
    await buyer.getByTestId('credit-pack-credit_1000').click();
    const co = buyer.getByTestId('checkout-modal');
    const content = (await co.getByTestId('checkout-content').textContent())!.trim();
    await buyer.close();

    await bankPays('1000000', `MBVCB ${content} chuyen khoan`);
    // Tab A không tải lại, không mở hộp thanh toán (không poll) — chỉ realtime làm mới.
    await expect(page.getByTestId('st-wal-balance')).toContainText('11.050', { timeout: 20_000 });
  });
});
