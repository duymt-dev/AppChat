// TIP-035 — E2E chế độ http: Tác vụ tự chủ (Cowork) trên backend thật. Tạo từ mẫu "Bản tin sáng" (không cần agent, không tốn
// credit) → thẻ hiện → drawer → Chạy ngay → worker ROLE=ai chạy, nhật ký có "Chạy xong" → xoá (xác nhận) → thẻ biến mất.
// Luồng agent + mục tiêu + duyệt gửi tin: integration `ai-tasks` (model giả — Q-001).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('tác vụ Cowork (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tạo từ mẫu → drawer → chạy ngay → nhật ký → xoá', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'aitasks');

    await page.goto('/assistant/cowork');
    await expect(page.getByTestId('cw-task')).toHaveCount(0);
    await page.getByTestId('cw-create').click();
    await expect(page.getByTestId('cw-save')).toBeDisabled();
    await page.getByTestId('cw-new').getByRole('button', { name: 'Bản tin sáng' }).click();
    await page.getByTestId('cw-save').click();
    await expect(page.getByTestId('cw-new')).toHaveCount(0);
    const card = page.getByTestId('cw-task');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Bản tin sáng');

    await card.click();
    const d = page.getByTestId('cw-drawer');
    await d.getByTestId('cw-drawer-run').click();
    await d.getByRole('tab', { name: 'Nhật ký & Chi phí' }).click();
    // Worker chạy bất đồng bộ: mở lại drawer tới khi nhật ký có lần chạy xong.
    await expect(async () => {
      await page.reload();
      await page.getByTestId('cw-task').click();
      await page.getByTestId('cw-drawer').getByRole('tab', { name: 'Nhật ký & Chi phí' }).click();
      await expect(page.getByTestId('cw-drawer')).toContainText('Chạy xong', { timeout: 2_000 });
    }).toPass({ timeout: 45_000 });

    page.once('dialog', (dl) => void dl.accept());
    await page.getByTestId('cw-drawer').getByTestId('cw-drawer-delete').click();
    await expect(page.getByTestId('cw-drawer')).toHaveCount(0);
    await expect(page.getByTestId('cw-task')).toHaveCount(0);
  });
});
