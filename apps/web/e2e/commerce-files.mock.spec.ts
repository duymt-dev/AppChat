// TIP-032d (mock): tab Tệp của đơn / đề nghị là danh sách thật theo bản ghi — chọn tệp → tải kèm đích → gắn → dòng mới với tên thật, mở
// lại drawer vẫn còn; gỡ hỏi xác nhận (cảnh báo tệp gốc vẫn giữ) → mất khỏi danh sách; tệp loại không hỗ trợ → lỗi rõ, không hiện là đã
// gắn; chứng từ đã sinh của đề nghị chỉ "Mở" (không gỡ); đổi sang đơn khác không mang tệp của đơn trước; mobile 390 không tràn, chạm ≥ 44.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const ORDERS = '/orders?session=authed,declared,trialSeen';
const INVOICES = '/invoices?session=authed,declared,trialSeen';

const filesTab = async (page: Page, drawer: string) => {
  const d = page.getByTestId(drawer);
  await d.getByRole('tab', { name: 'Tệp' }).click();
  return d;
};
const pick = (page: Page, testId: string, name: string, body = '%PDF-1.4\n%%EOF', mimeType = 'application/pdf') =>
  page.getByTestId(testId).setInputFiles({ name, mimeType, buffer: Buffer.from(body) });

test.describe('commerce-files', () => {
  test('đơn: tải lên → gắn → còn sau khi mở lại → gỡ có xác nhận', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(ORDERS);
    await page.locator('[data-order="ord_290411"]').click();
    const d = await filesTab(page, 'od-drawer');
    const panel = d.getByTestId('rf-order');
    // Seed từ fixture prototype: 3 tệp, PDF đề nghị của hệ thống không phải tệp người dùng gắn ở đơn.
    await expect(panel.getByTestId('rf-order-row').first()).toBeVisible();
    const before = await panel.getByTestId('rf-order-row').count();

    await pick(page, 'rf-order-input', 'Biên bản giao.pdf');
    await expect(panel.getByTestId('rf-order-row')).toHaveCount(before + 1);
    await expect(panel).toContainText('Biên bản giao.pdf');

    await page.keyboard.press('Escape');
    await page.locator('[data-order="ord_290411"]').click();
    const again = await filesTab(page, 'od-drawer');
    await expect(again.getByTestId('rf-order')).toContainText('Biên bản giao.pdf');

    const row = again.getByTestId('rf-order-row').filter({ hasText: 'Biên bản giao.pdf' });
    await row.getByTestId('rf-order-detach').click();
    const ask = page.locator('.ant-modal-confirm');
    await expect(ask).toContainText('Tệp gốc vẫn được lưu');
    await ask.getByRole('button', { name: 'Gỡ' }).click();
    await expect(again.getByTestId('rf-order')).not.toContainText('Biên bản giao.pdf');
  });

  test('đơn: loại tệp không hỗ trợ → lỗi rõ, không thêm dòng; đổi đơn không mang tệp đơn trước', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(ORDERS);
    await page.locator('[data-order="ord_290411"]').click();
    const d = await filesTab(page, 'od-drawer');
    const before = await d.getByTestId('rf-order-row').count();
    await pick(page, 'rf-order-input', 'trang.html', '<!doctype html><script>1</script>', 'text/html');
    await expect(d.getByTestId('rf-order-error')).toContainText('loại tệp không hỗ trợ');
    await expect(d.getByTestId('rf-order-row')).toHaveCount(before);

    await page.keyboard.press('Escape');
    await page.locator('[data-order="ord_290410"]').click();
    const other = await filesTab(page, 'od-drawer');
    await expect(other.getByTestId('rf-order-empty')).toBeVisible();
    await expect(other.getByTestId('rf-order-error')).toHaveCount(0);
  });

  test('đề nghị: chứng từ đã sinh chỉ Mở, tệp người dùng gắn gỡ được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(INVOICES);
    await page.locator('[data-invoice="inv_2039"]').click();
    const d = await filesTab(page, 'iv-drawer');
    const gen = d.locator('[data-testid="rf-invoice-row"][data-kind="generated_invoice"]');
    await expect(gen).toHaveCount(1);
    await expect(gen.getByTestId('rf-invoice-detach')).toHaveCount(0);
    await expect(gen.getByRole('button', { name: /Mở/ })).toBeEnabled();

    await pick(page, 'rf-invoice-input', 'Uỷ nhiệm chi.png', '\x89PNG', 'image/png');
    const mine = d.locator('[data-testid="rf-invoice-row"][data-kind="user_attachment"]').filter({ hasText: 'Uỷ nhiệm chi.png' });
    await expect(mine).toHaveCount(1);
    await expect(mine.getByTestId('rf-invoice-detach')).toBeVisible();
  });

  test('mobile 390: tab Tệp không tràn ngang, nút chạm ≥ 44', async ({ page }) => {
    test.skip(!isMobile(page), 'luồng mobile');
    await page.goto(ORDERS);
    await page.locator('[data-order="ord_290411"]').first().click();
    const d = await filesTab(page, 'od-drawer');
    await expect(d.getByTestId('rf-order-upload')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(d.getByTestId('rf-order').getByRole('button'));
  });
});
