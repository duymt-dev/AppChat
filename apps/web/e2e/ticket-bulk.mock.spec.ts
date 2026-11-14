// TIP-034c (mock): chọn nhiều có ticket đã đóng → xem trước → kết quả TỪNG id (đóng = chưa áp dụng, vẫn được chọn), Hoàn tác qua action
// chuẩn ticket.bulk_undo (xem trước + xác nhận); hoàn tác log cha ở Nhật ký đi qua cầu nối (409 UNDO_REQUIRES_ACTION → action chuẩn),
// không báo "đã hoàn tác" giả. Mobile 390: màn không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/tickets?session=authed,declared,trialSeen';
const check = (page: import('@playwright/test').Page, id: string) => page.locator(`[data-ticket="${id}"] input[type="checkbox"]`).check();

test.describe('ticket bulk', () => {
  test('gán hàng loạt: kết quả từng id, giữ chọn ticket đóng, hoàn tác qua action chuẩn', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await check(page, 'tk_2041');
    await check(page, 'tk_2034');
    await check(page, 'tk_2037');
    await page.getByTestId('tk-bulk-priority').click();
    await page.getByRole('menuitem', { name: 'Thấp' }).click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    const box = page.getByTestId('tk-bulk-results');
    await expect(box).toHaveAttribute('data-status', 'completed');
    await expect(box.getByTestId('tk-bulk-summary')).toHaveText('2 ticket đã đổi · 0 đã đúng sẵn · 1 chưa áp dụng');
    await expect(box.locator('[data-outcome="INVALID_TRANSITION"]')).toContainText('Ticket đã đóng');
    // Ticket chưa áp dụng được vẫn được chọn để xử lý tiếp.
    await expect(page.getByTestId('tk-bulk')).toContainText('Đã chọn 1 ticket');
    await box.getByTestId('tk-bulk-undo').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(box.getByTestId('tk-bulk-undo-summary')).toHaveText('Đã hoàn tác 2 ticket · 0 xung đột giữ nguyên · 0 không hoàn tác được');
    await expect(box.getByTestId('tk-bulk-undo')).toHaveCount(0);
    await box.getByTestId('tk-bulk-close').click();
    await expect(box).toHaveCount(0);
  });

  test('giao AI Agent ghi rõ agent chưa chạy; Nhật ký hoàn tác log cha qua cầu nối có xác nhận', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await check(page, 'tk_2041');
    await page.getByTestId('tk-bulk-ai').click();
    await expect(page.getByText('Giao cho AI Agent chỉ là phân công')).toBeVisible();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByTestId('tk-bulk-agent-note')).toContainText('agent chưa chạy');
    await expect(page.locator('[data-ticket="tk_2041"]')).toContainText('AI Agent');
    // Điều hướng trong app (giữ store mock) → Nhật ký → hoàn tác log cha: cầu nối mở xem trước của ticket.bulk_undo, xác nhận mới ghi.
    await page.getByTestId('tk-bulk-close').click();
    await page.locator('[data-nav="assistant"]').hover();
    await page.getByTestId('flyout-assistant').getByText('Nhật ký hành động').click();
    const row = page.locator('[data-log]').filter({ hasText: 'ticket.bulk_update' }).first();
    await row.getByTestId('log-undo').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(row.getByTestId('log-status-badge')).toHaveText('Đã hoàn tác');
  });

  test('mobile 390: chọn nhiều không có trên thẻ — màn không tràn ngang, không có khung kết quả treo', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await page.locator('[data-ticket]').first().waitFor();
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId('tk-bulk-results')).toHaveCount(0);
  });
});
