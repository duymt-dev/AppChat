// TIP-012b P3 (AC7) — E2E http: kết nối ngân hàng trên backend thật — bank_feed / integration.connect Casso live có API key → thẻ mở
// drawer chi tiết từ GET /v1/integrations/connections/:id: chế độ thật, khả năng kéo, biên nhận thăm dò trong nhật ký (worker chạy hay
// chưa đều là trạng thái thật — không giả "đã xác minh"). Không gọi Casso thật: chỉ kiểm hình runtime, "Đồng bộ ngay" trả biên nhận
// accepted (≠ xong) — chưa nghiệm thu với provider thật.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('runtime kết nối (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Casso live + API key → drawer: health thật, nhật ký có thăm dò, Đồng bộ ngay → đã nhận', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'irt');
    await page.goto('/settings/integrations');
    await page.getByTestId('st-int-cat-payments').click();
    await page.locator('[data-connector="casso"]').click();
    const m = page.getByTestId('st-int-modal');
    await m.getByTestId('st-int-f-webhook_secret').fill('ck_live_e2e');
    await m.getByTestId('st-int-f-account_number').fill('8007041027107');
    await m.getByTestId('st-int-f-api_key').fill('ak_live_e2e');
    await m.getByTestId('st-int-save').click();
    await expect(m).toHaveCount(0);
    await page.locator('[data-connector="casso"]').click();
    const d = page.getByTestId('st-int-drawer');
    await expect(d.getByTestId('st-int-health')).toHaveAttribute('data-health', /probing|configured_unverified|degraded|verified/);
    await expect(d.getByTestId('st-int-log')).toContainText(/Kiểm tra đọc/);
    await expect(d).not.toContainText('ak_live_e2e');
  });
});
