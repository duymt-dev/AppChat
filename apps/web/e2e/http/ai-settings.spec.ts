// TIP-019 AC5 — E2E chế độ http (pnpm e2e:http): Cài đặt › Mô hình AI trên backend thật — 3 mức (không tên model — D29), trial
// Cá nhân Pro mở cả 3 mức; đổi mức mặc định + mức theo tác vụ + hạn mức credit → tải lại vẫn giữ (đọc từ `ai_setting`).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('mô hình AI (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('đổi mức mặc định, mức tác vụ, hạn mức — giữ sau tải lại', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'ai');
    await page.goto('/settings/ai_models');
    await expect(page.locator('[data-tier]')).toHaveCount(3);
    await expect(page.getByText(/Claude|Haiku|Sonnet|Opus|GPT/)).toHaveCount(0);
    await expect(page.getByTestId('st-ai-tier-standard')).toHaveText('Đang dùng mặc định');
    await expect(page.getByTestId('st-ai-task-copilot').locator('option')).toHaveCount(3);

    await page.getByTestId('st-ai-tier-advanced').click();
    await expect(page.getByTestId('st-ai-tier-advanced')).toHaveText('Đang dùng mặc định');
    await page.getByTestId('st-ai-task-copilot').selectOption('max');
    await page.getByTestId('st-ai-budget').fill('8000000');
    await page.getByTestId('st-ai-task-insights').focus();
    await expect(page.getByTestId('st-ai-budget')).toHaveValue('8,000,000');

    await page.reload();
    await expect(page.getByTestId('st-ai-tier-advanced')).toHaveText('Đang dùng mặc định');
    await expect(page.getByTestId('st-ai-task-copilot')).toHaveValue('max');
    await expect(page.getByTestId('st-ai-budget')).toHaveValue('8,000,000');
  });
});
