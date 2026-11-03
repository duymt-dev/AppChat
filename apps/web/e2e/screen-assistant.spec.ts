// Trợ lý theo màn (TIP-023c G2, mock): drawer Khách hàng gửi lượt THẬT kèm ngữ cảnh màn → cây GenUI gọn (compact) trong drawer; nút ui
// lọc bảng / tô sáng đúng dòng; nút action do Trợ lý đề nghị → thẻ xem trước; "Mở trong Trợ lý" nạp lại cùng phiên (không gọi model).
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/customers?session=authed,declared,trialSeen';

const openDrawer = async (page: Page) => {
  await page.goto(URL);
  await expect(page.locator('[data-contact]').first()).toBeVisible();
  await page.getByTestId('crm-ai').click();
  return page.getByTestId('crm-ai-drawer');
};

test.describe('screen-assistant', () => {
  test('nút nhanh → cây compact; lọc bảng; tô sáng dòng; Mở trong Trợ lý cùng phiên', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    const drawer = await openDrawer(page);
    await drawer.getByTestId('crm-ai-run-churn').click();
    const ui = drawer.getByTestId('genui');
    await expect(ui).toHaveAttribute('data-mode', 'compact');
    await expect(ui.getByTestId('genui-stat')).toContainText('37');
    // compact: danh sách 6 khách → 5 dòng + "Mở rộng"
    await expect(ui.getByTestId('genui-expand')).toBeVisible();
    await ui.getByRole('button', { name: 'Tô sáng chị Lan' }).click();
    await expect(page.locator('[data-contact="ct_lan"][data-highlighted="true"]')).toBeVisible();
    await ui.getByRole('button', { name: 'Lọc trên bảng' }).click();
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
    await expect(page.locator('[data-contact]')).toHaveCount(4);
    await drawer.getByTestId('crm-ai-full').click();
    await expect(page).toHaveURL(/\/assistant$/);
    const full = page.getByTestId('genui');
    await expect(full).toHaveAttribute('data-mode', 'full');
    await expect(full.getByTestId('genui-stat')).toContainText('37');
    await expect(page.getByText('Tìm khách có nguy cơ rời bỏ', { exact: false }).first()).toBeVisible();
  });

  test('nút action trong drawer → thẻ xem trước (không chạy thẳng)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    const drawer = await openDrawer(page);
    await drawer.getByTestId('crm-ai-run-dedupe').click();
    await expect(drawer.getByTestId('genui-table').locator('tbody tr')).toHaveCount(3);
    await drawer.getByRole('button', { name: 'Gắn thẻ VIP cho chị Lan' }).click();
    const preview = page.getByRole('dialog', { name: 'Xác nhận thao tác' });
    await expect(preview).toBeVisible();
    await preview.getByRole('button', { name: 'Huỷ' }).click();
    await expect(preview).toBeHidden();
  });

  test('mobile: drawer không tràn ngang khi có cây', async ({ page }) => {
    test.skip(!isMobile(page), 'mobile');
    const drawer = await openDrawer(page);
    await drawer.getByTestId('crm-ai-run-pipeline').click();
    await expect(drawer.getByTestId('genui')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
