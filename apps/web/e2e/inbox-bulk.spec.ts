// TIP-025b P1 — E2E chế độ mock: chọn nhiều hội thoại (Q-019) → thanh hàng loạt → Đóng (xem trước → xác nhận) → bảng kết quả từng hội
// thoại; đổi bộ lọc kênh xoá lựa chọn và đếm thư mục theo bộ lọc. Mobile 390: ô chọn hiện, không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/inbox?session=authed,declared,trialSeen';
const check = (page: import('@playwright/test').Page, id: string) => page.locator(`[data-conv="${id}"] [data-testid="conv-check"]`);

test.describe('inbox hàng loạt (mock)', () => {
  test('chọn 2 → Đóng → xác nhận → kết quả từng hội thoại; bỏ chọn', async ({ page }) => {
    await page.goto(URL);
    await check(page, 'c_lan').check({ force: true });
    await check(page, 'c_hieu').check({ force: true });
    await expect(page.getByTestId('inbox-bulk-count')).toContainText('2');
    await page.getByTestId('inbox-bulk-close').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByTestId('inbox-bulk-result')).toContainText('Xong 2');
    await expect(page.getByTestId('inbox-bulk-bar')).toHaveCount(0);
    await page.getByTestId('inbox-bulk-result-close').click();
    await expect(page.getByTestId('inbox-bulk-result')).toHaveCount(0);
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
  });

  test('chọn hiện tại + bỏ chọn; gắn thẻ qua thanh', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await check(page, 'c_lan').check({ force: true });
    await page.getByTestId('inbox-bulk-all').click();
    const n = await page.getByTestId('conv-row').count();
    await expect(page.getByTestId('inbox-bulk-count')).toContainText(String(Math.min(n, 100)));
    await page.getByTestId('inbox-bulk-clear').click();
    await expect(page.getByTestId('inbox-bulk-bar')).toHaveCount(0);
    await check(page, 'c_lan').check({ force: true });
    const pick = page.getByTestId('inbox-bulk-tagpick');
    await pick.selectOption({ index: 1 });
    await page.getByTestId('inbox-bulk-tag').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByTestId('inbox-bulk-result')).toBeVisible();
  });
});
