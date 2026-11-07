// TIP-023b luồng dọc (http, model giả `AI_ENGINE=mock`): Cowork "tạo khách hàng …" → thẻ hiện đổi gì (ô sẽ tạo) → Sửa SĐT trong thẻ →
// Xem trước lại (chưa ghi) → thẻ mới mang SĐT mới → Xác nhận → khách lưu đúng SĐT đã sửa (một lần) → mở màn Khách hàng đọc lại.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('Trợ lý — luồng dọc (http)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await spoofIp(page);
  });

  test('thẻ xem trước có thay đổi → Sửa → xem trước lại → xác nhận chạy input mới một lần → đọc lại ở màn Khách hàng', async ({ page }) => {
    await onboarded(page, 'asst-vertical');
    await page.goto('/assistant');
    await page.getByRole('radio', { name: 'Cowork' }).click();
    await page.getByTestId('asst-composer').locator('textarea').fill('tạo khách hàng Vy Dọc 0909111222');
    await page.getByTestId('asst-send').click();
    const card = page.getByTestId('asst-card').last();
    await expect(card).toHaveAttribute('data-status', 'pending', { timeout: 20_000 });
    await expect(card.getByTestId('asst-card-changes')).toContainText('0909111222');

    await card.getByTestId('asst-card-edit').click();
    const form = page.getByTestId('asst-edit');
    await form.locator('[data-field="phone"]').fill('0909333444');
    await form.getByTestId('asst-edit-save').click();
    await expect(form).toBeHidden({ timeout: 15_000 });
    await expect(card.getByTestId('asst-card-changes')).toContainText('0909333444');
    await expect(card).toHaveAttribute('data-status', 'pending');

    await card.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(card).toHaveAttribute('data-status', 'done', { timeout: 20_000 });
    await page.goto('/customers');
    await expect(page.locator('body')).toContainText('Vy Dọc', { timeout: 15_000 });
    await expect(page.locator('body')).toContainText('0909333444');
    await expect(page.locator('body')).not.toContainText('0909111222');
  });
});
