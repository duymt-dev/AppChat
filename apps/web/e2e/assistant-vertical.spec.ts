// TIP-023b luồng dọc (mock): thẻ xác nhận hiện đổi gì (ActionPreview `changes`) → Sửa theo khuôn input (mảng dòng, enum) → Xem trước lại
// (chưa ghi, thẻ cũ thay bằng thẻ mới) → lỗi từng ô khi thiếu bắt buộc → Xác nhận → đã lưu; nhật ký chỉ một dòng.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';

const ask = async (page: Page, text: string) => {
  const box = page.getByTestId('asst-composer').locator('textarea');
  await box.fill(text);
  await box.press('Enter');
};

test.describe('assistant-vertical', () => {
  test.beforeEach(({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
  });

  test('báo giá: thẻ có thay đổi → Sửa số lượng dòng → xem trước lại → xác nhận', async ({ page }) => {
    await page.goto(`/assistant${Q}`);
    await ask(page, 'Tạo báo giá cho chị Lan');
    const card = page.getByTestId('asst-card');
    await expect(card).toHaveAttribute('data-status', 'pending');
    await expect(card.getByTestId('asst-card-changes')).toContainText('HIFU nâng cơ');

    await card.getByTestId('asst-card-edit').click();
    const form = page.getByTestId('asst-edit');
    await expect(form.locator('[data-field="items.0.qty"]')).toHaveValue('8');
    await form.locator('[data-field="items.0.qty"]').fill('10');
    await form.getByTestId('add-items').click();
    await form.locator('[data-field="items.1.name"]').fill('Chăm sóc da');
    await form.getByTestId('asst-edit-save').click();
    await expect(form).toBeHidden();
    await expect(card.getByTestId('asst-card-changes')).toContainText('Chăm sóc da');
    await expect(card).toHaveAttribute('data-status', 'pending');

    await card.getByRole('button', { name: 'Xác nhận & lưu' }).click();
    await expect(card).toContainText('Đã lưu vào Báo giá');
  });

  test('ticket: bỏ trống tiêu đề → lỗi ô, thẻ cũ giữ nguyên; enum ưu tiên chọn được', async ({ page }) => {
    await page.goto(`/assistant${Q}`);
    await ask(page, 'tạo ticket nhắc việc cho Minh');
    const card = page.getByTestId('asst-card');
    await card.getByTestId('asst-card-edit').click();
    const form = page.getByTestId('asst-edit');
    await form.locator('[data-field="priority"]').selectOption('high');
    await form.locator('[data-field="title"]').fill('');
    await form.getByTestId('asst-edit-save').click();
    await expect(form).toContainText('required');
    await form.locator('[data-field="title"]').fill('Gọi lại cho Minh');
    await form.getByTestId('asst-edit-save').click();
    await expect(form).toBeHidden();
    await expect(card.getByTestId('asst-card-changes')).toContainText('high');
    await card.getByRole('button', { name: 'Huỷ' }).click();
    await expect(card).toContainText('AppChat không thực thi');
  });
});
