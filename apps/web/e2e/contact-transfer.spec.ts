// TIP-015d P2 (mock): chuyển phụ trách — một khách đóng hộp sau khi chuyển thật; nhiều khách hiện kết quả THẬT theo từng khách (đã chuyển /
// đã là người phụ trách / số bản ghi chuyển kèm) ngay trong hộp, không toast "đã chuyển N" giả; báo giá: người báo giá bất biến khi sửa.
import { expect, test } from '@playwright/test';
import { isMobile } from './support/mobile';

const URL = '/customers?session=authed,declared,trialSeen';

test.describe('chuyển phụ trách (TIP-015d)', () => {
  test('gán phụ trách nhiều khách: kết quả theo khách — đã chuyển + đã là người phụ trách + số chuyển kèm', async ({ page }) => {
    test.skip(isMobile(page), 'chọn nhiều + Gán phụ trách chỉ desktop');
    await page.goto(URL);
    await page.getByTestId('crm-toolbar').locator('input[type="checkbox"]').first().check();
    await page.getByTestId('crm-bulk-assign').click();
    const dlg = page.getByTestId('crm-bulk-transfer');
    await dlg.getByTestId('bulk-transfer-to').selectOption('u_tram');
    await dlg.getByTestId('bulk-transfer-submit').click();
    const res = dlg.getByTestId('transfer-result');
    await expect(res).toBeVisible();
    await expect(res.locator('[data-stat="skipped"] b')).not.toHaveText('0');
    await expect(res.locator('[data-stat="transferred"] b')).not.toHaveText('0');
    await expect(dlg.getByTestId('transfer-moved')).toContainText('hội thoại');
    await expect(dlg.getByTestId('bulk-transfer-submit')).toHaveCount(0);
    await dlg.getByRole('button', { name: 'Đóng' }).first().click();
    await expect(page.locator('[data-contact="kh_1002"]')).toContainText('Trâm');
  });

  test('một khách: chuyển thật → đóng hộp, danh sách cập nhật', async ({ page }) => {
    test.skip(isMobile(page), 'menu dòng chỉ desktop');
    await page.goto(URL);
    await page.locator('[data-contact="kh_1003"] .row-dots').click();
    await page.getByRole('menuitem', { name: 'Chuyển phụ trách' }).click();
    await page.getByTestId('transfer-to').selectOption('u_khoa');
    await page.getByTestId('transfer-submit').click();
    await expect(page.getByTestId('crm-transfer')).toHaveCount(0);
    await expect(page.locator('[data-contact="kh_1003"]')).toContainText('Khoa');
  });
});
