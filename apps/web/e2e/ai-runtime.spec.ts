// TIP-019b P3 §5.4 (AC8): khung "Trợ lý AI đang điều phối" — nhãn theo trạng thái thật, thanh tiến độ chỉ khi đang chạy (không giả 100%),
// bấm hàng mở drawer chi tiết run (trạng thái, các bước); Dừng → run rời danh sách đang sống.
import { expect, test } from '@playwright/test';
import { isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';

test.describe('ai-runtime', () => {
  test('khung điều phối: nhãn thật, drawer chi tiết run, Dừng → rời danh sách', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant${Q}`);
    await page.getByRole('radio', { name: 'Cowork' }).click();
    await page.getByTestId('cw-run-bar').getByRole('button').click();
    const modal = page.getByTestId('cw-run-modal');
    const wait = modal.locator('[data-run="run_2"]');
    await expect(wait.getByTestId('run-status')).toHaveAttribute('data-lifecycle', 'waiting_approval');
    // Chờ duyệt: không có thanh tiến độ giả.
    await expect(wait.locator('span[style*="width"]')).toHaveCount(0);

    await modal.locator('[data-run="run_1"]').getByText('Nhắc công nợ 6 khách quá hạn').click();
    const drawer = page.getByTestId('run-detail');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId('run-status').first()).toHaveAttribute('data-lifecycle', 'running');
    await expect(drawer.getByTestId('run-step').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    await modal.locator('[data-run="run_3"]').getByTestId('cw-run-act').click();
    // Danh sách đang sống (`status=live`) bỏ run đã dừng.
    await expect(modal.locator('[data-run="run_3"]')).toHaveCount(0);
  });
});
