// TIP-023d — E2E chế độ http (pnpm e2e:http): kế hoạch Cowork trên backend thật (model giả `AI_ENGINE=mock`). "lập kế hoạch tạo khách
// hàng …" → thẻ xác nhận kế hoạch → Xác nhận → thẻ kế hoạch (bản 1, đang chạy, 0/2) + thẻ xác nhận tạo khách (bước 1 ràng kế hoạch) →
// Xác nhận → bước 1 "Đã xong" (biên nhận thật), lượt dừng chờ bước kế (§2.5) → Sửa kế hoạch → Đã dừng → Tiếp tục. Không có câu
// "hoàn tác" việc đã làm.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('Kế hoạch Cowork (http)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await spoofIp(page);
  });

  test('lập kế hoạch → xác nhận → tiến độ thật theo biên nhận → sửa kế hoạch → tiếp tục', async ({ page }) => {
    await onboarded(page, 'plans');
    await page.goto('/assistant');
    await page.getByRole('radio', { name: 'Cowork' }).click();
    await page.getByTestId('asst-composer').locator('textarea').fill('lập kế hoạch tạo khách hàng Ngân Kế Hoạch 0912345688');
    await page.getByTestId('asst-send').click();
    const planCard = page.getByTestId('asst-card').last();
    await expect(planCard).toHaveAttribute('data-status', 'pending', { timeout: 20_000 });
    await planCard.getByRole('button', { name: 'Xác nhận' }).click();

    const card = page.getByTestId('plan-card');
    await expect(card).toHaveAttribute('data-phase', 'active', { timeout: 20_000 });
    await expect(card.getByTestId('plan-step')).toHaveCount(2);
    await expect(card.getByTestId('plan-progress')).toContainText('0/2');

    // Bước 1 là hiệu ứng chính của kế hoạch: xác nhận → biên nhận thật → "Đã xong".
    const create = page.getByTestId('asst-card').last();
    await expect(create).toContainText('Tạo khách hàng', { timeout: 20_000 });
    await create.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(create).toHaveAttribute('data-status', 'done', { timeout: 20_000 });
    await expect(card.getByTestId('plan-step').first()).toHaveAttribute('data-state', 'succeeded', { timeout: 20_000 });
    await expect(card.getByTestId('plan-progress')).toContainText('1/2');
    await expect(card).not.toContainText('Hoàn tác');
    // Lượt dừng khi còn bước (§2.5): run gốc chờ, không "xong" — nút chạy bước kế hiện ra.
    await expect(card.getByTestId('plan-continue')).toBeVisible({ timeout: 20_000 });

    // Sửa kế hoạch → server xả xong → Đã dừng; Tiếp tục là nút riêng (chạy tiếp cùng run).
    await card.getByTestId('plan-request-edit').click();
    await expect(card).toHaveAttribute('data-phase', 'paused', { timeout: 20_000 });
    await expect(card.getByTestId('plan-step').first()).toHaveAttribute('data-state', 'succeeded');
    await card.getByTestId('plan-resume').click();
    await expect(card).not.toHaveAttribute('data-phase', 'paused', { timeout: 20_000 });
  });
});
