// TIP-023 AC5 — E2E chế độ http (pnpm e2e:http): Trợ lý AI trên backend thật (model giả `AI_ENGINE=mock` — Q-001). Hỏi chữ → trả
// lời; Cowork "tạo khách hàng …" → thẻ xác nhận → Xác nhận → "Đã lưu vào Khách hàng" + câu chốt + mở đúng màn; Nhật ký hành động có
// dòng vừa tạo; hỏi từ Trợ lý thu nhỏ (màn khác) → màn Trợ lý nhận câu hỏi và trả lời. Phiên / tin lưu DB: integration `assistant`.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded } from './support';

test.describe('Trợ lý AI (http)', () => {
  test.beforeEach(({ page }) => test.skip(isMobile(page), 'luồng desktop'));

  test('hỏi → trả lời; Cowork tạo khách → xác nhận → lưu + mở màn; nhật ký có dòng vừa tạo', async ({ page }) => {
    await onboarded(page, 'assistant');
    await page.goto('/assistant');
    await page.getByRole('radio', { name: 'Cowork' }).click();
    await page.getByTestId('asst-composer').locator('textarea').fill('Xin chào trợ lý');
    await page.getByTestId('asst-send').click();
    await expect(page.getByTestId('asst-ai-msg').last()).toContainText('Đã nhận: Xin chào trợ lý', { timeout: 20_000 });

    // Thao tác ghi → thẻ xác nhận (chưa ghi gì cho tới khi bấm Xác nhận).
    await page.locator('textarea').last().fill('tạo khách hàng Lan Trợ Lý 0909123456');
    await page.getByTestId('asst-send').last().click();
    const card = page.getByTestId('asst-card').last();
    await expect(card).toHaveAttribute('data-status', 'pending', { timeout: 20_000 });
    await expect(card).toContainText('Tạo khách hàng');
    await card.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(card).toHaveAttribute('data-status', 'done', { timeout: 20_000 });
    await expect(card).toContainText('Đã lưu vào Khách hàng');
    await expect(page.getByTestId('asst-ai-msg').last()).toContainText('Đã lưu khách hàng mới.');
    await card.getByRole('button', { name: /Đã lưu vào Khách hàng/ }).click();
    await expect(page).toHaveURL(/\/customers/);
    await expect(page.locator('body')).toContainText('Lan Trợ Lý', { timeout: 15_000 });

    await page.goto('/assistant/actions');
    await page.getByTestId('log-search').fill('lan tro ly');
    await expect(page.getByTestId('action-log')).toContainText('Tạo khách hàng "Lan Trợ Lý"', { timeout: 15_000 });
  });

  test('Trợ lý thu nhỏ ở màn khác gửi câu hỏi → màn Trợ lý trả lời', async ({ page }) => {
    await onboarded(page, 'assistantdock');
    await page.goto('/invoices');
    await page.getByTestId('iv-ai-open').click();
    await expect(page.getByTestId('assistant-dock')).toBeVisible();
    await page.getByTestId('dock-input').fill('Khách nào cần chăm sóc?');
    await page.getByTestId('dock-input').press('Enter');
    await expect(page).toHaveURL(/\/assistant$/, { timeout: 15_000 });
    await expect(page.getByTestId('asst-ai-msg').last()).toContainText('Đã nhận: Khách nào cần chăm sóc?', { timeout: 20_000 });
  });
});
