// TIP-038 pha 2 — E2E http (backend thật): Tổng quan đọc GET /v1/dashboard — workspace mới không có số mẫu prototype (không việc follow / việc
// cần tôi giả, AI hôm nay 0, thẻ agent trống); Owner thấy ví Credit thật (10.000 credit trial); checklist onboarding ghi bền (tải lại vẫn giữ).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('Tổng quan (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('workspace mới: không số mẫu, Credit thật của Owner, onboarding bền', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'dashboard');
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expect(page.getByTestId('dash-my-work')).toContainText('Không có việc nào đang chờ bạn');
    await expect(page.getByTestId('dash-ai-today')).toContainText('0');
    await expect(page.getByTestId('dash-credit')).toContainText('10.000');
    await expect(page.getByTestId('updates-widget')).toContainText('0 khách đến hạn');
    await expect(page.getByTestId('dashboard')).not.toContainText('Chị Linh Phạm');
    await page.getByTestId('onb-step-channel').getByRole('button', { name: 'Đánh dấu bước' }).click();
    await expect(page.getByTestId('onb-checklist')).toContainText('1/5 hoàn tất');
    await page.reload();
    await expect(page.getByTestId('onb-checklist')).toContainText('1/5 hoàn tất');
  });
});
