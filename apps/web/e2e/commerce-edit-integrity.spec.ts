// TIP-032c (mock): Sửa đơn mở đúng đơn từ drawer (không dùng form tạo); người tạo hiện chỉ đọc, đổi người phụ trách + ghi chú → drawer hiện
// người phụ trách mới, người tạo giữ nguyên; người khác sửa trước (version đổi) → 409 → thông báo xung đột, ô đang nhập giữ nguyên,
// "Tải lại" xoá xung đột. Form tạo vẫn là tạo mới. Hợp đồng nháp: form sửa có ô "Người phụ trách hiện tại".
import { expect, test } from '@playwright/test';
import { isMobile } from './support/mobile';

const ORDERS = '/orders?session=authed,declared,trialSeen';
const CONTRACTS = '/contracts?session=authed,declared,trialSeen';

test.describe('commerce edit integrity', () => {
  test('đơn: Sửa từ drawer → đổi người phụ trách, người tạo giữ nguyên; tạo mới vẫn là form tạo', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(ORDERS);
    await page.locator('[data-order="ord_290409"]').click();
    const drawer = page.getByTestId('od-drawer');
    await drawer.getByTestId('od-edit-open').click();
    const edit = page.getByTestId('od-edit');
    await expect(edit).toContainText('DH-');
    await expect(edit.getByTestId('od-edit-owner')).toHaveValue('Trâm');
    await expect(edit.getByTestId('od-edit-owner')).toBeDisabled();
    await edit.getByTestId('od-edit-assigned').selectOption('u_minh');
    await edit.getByTestId('od-edit-note').fill('Giao chiều');
    await edit.getByTestId('od-edit-save').click();
    await expect(edit).toHaveCount(0);
    await expect(drawer.getByTestId('od-assigned')).toContainText('Minh');
    await expect(drawer).toContainText('Trâm');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await page.getByTestId('od-create').click();
    await expect(page.getByTestId('od-form')).toBeVisible();
    await expect(page.getByTestId('od-edit')).toHaveCount(0);
  });

  test('đơn: bản ghi đổi trong lúc sửa → 409 xung đột, giữ nội dung, Tải lại', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(ORDERS);
    await page.locator('[data-order="ord_290409"]').click();
    await page.getByTestId('od-drawer').getByTestId('od-edit-open').click();
    const edit = page.getByTestId('od-edit');
    await edit.getByTestId('od-edit-note').fill('Bản của tôi');
    // Một ghi khác lưu trước (ô vận chuyển trên drawer phía sau, cùng đơn) → phiên bản đơn tăng; modal vẫn giữ version lúc mở.
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="od-ship-save"]') as HTMLButtonElement | null;
      el?.click();
    });
    await expect(page.locator('.ant-message')).toContainText('Cập nhật vận chuyển');
    await edit.getByTestId('od-edit-save').click();
    await expect(edit.getByTestId('od-conflict')).toBeVisible();
    await expect(edit.getByTestId('od-edit-note')).toHaveValue('Bản của tôi');
    await edit.getByTestId('od-conflict-reload').click();
    await expect(page.getByTestId('od-conflict')).toHaveCount(0);
  });

  test('hợp đồng nháp: form sửa có Người phụ trách hiện tại', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(CONTRACTS);
    const draft = page.locator('[data-contract]').filter({ hasText: 'Nháp' }).first();
    await draft.click();
    await page.getByTestId('ct-edit').click();
    await expect(page.getByTestId('ct-form')).toContainText('Người phụ trách hiện tại');
  });
});
