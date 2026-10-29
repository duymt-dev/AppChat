import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/tickets?session=authed,declared,trialSeen';

test.describe('tickets', () => {
  test('danh sách: 14 ticket, KPI bấm để lọc, lọc SLA / người xử lý, tìm không dấu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-ticket]')).toHaveCount(14);
    await expect(page.getByTestId('tk-kpi-breach-v')).toHaveText('1');
    await page.getByTestId('tk-kpi-breach').click();
    await expect(page.locator('[data-ticket]')).toHaveCount(1);
    await expect(page.locator('[data-ticket="tk_2041"]')).toContainText('Quá hạn 2h 30m');
    await page.getByTestId('tk-kpi-total').click();
    await page.getByTestId('tk-f-assignee').selectOption('agent');
    await expect(page.locator('[data-ticket]')).toHaveCount(5);
    await page.getByTestId('tk-f-assignee').selectOption('all');
    await page.getByTestId('tk-search').fill('hoa don vat');
    await expect(page.locator('[data-ticket]')).toHaveCount(1);
    await expect(page.locator('[data-ticket="tk_2035"]')).toBeVisible();
  });

  test('kanban 4 cột theo trạng thái; kéo thả không cần — mở thẻ ra drawer', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('tk-view-kanban').click();
    const board = page.getByTestId('tk-kanban');
    await expect(board.locator('[data-ticket]')).toHaveCount(14);
    await board.locator('[data-ticket="tk_2038"]').click();
    await expect(page.getByTestId('tk-drawer').getByTestId('tk-status')).toHaveText('Đang chờ');
  });

  test('drawer: trao đổi (ghi chú nội bộ + trả lời khách), giao AI, lịch sử ghi sự kiện', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-ticket="tk_2041"]').click();
    const d = page.getByTestId('tk-drawer');
    await expect(d.getByTestId('tk-sla-left')).toHaveText('Quá hạn 2h 30m');
    await d.getByTestId('tk-comment').fill('Đã gọi khách, hẹn đổi sang thứ 6');
    await d.getByTestId('tk-send').click();
    await d.getByTestId('tk-mode-reply').click();
    await d.getByTestId('tk-comment').fill('Dạ em đã đổi lịch cho anh/chị ạ');
    await d.getByTestId('tk-send').click();
    await d.getByRole('tab', { name: 'Trao đổi' }).click();
    await expect(d.locator('[data-comment="internal"]')).toHaveCount(1);
    await expect(d.locator('[data-comment="public"]')).toHaveCount(3);
    await expect(d.getByTestId('tk-ai-state')).toHaveText('AI tự xử lý đang tắt');
    await d.getByTestId('tk-takeover').click();
    await expect(d.getByTestId('tk-ai-state')).toHaveText('AI đang tự xử lý');
    await d.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(d.getByTestId('tk-history')).toContainText('Thêm ghi chú nội bộ');
    await expect(d.getByTestId('tk-history')).toContainText('Trả lời khách');
  });

  test('đóng ticket bắt buộc lý do → Đã đóng + ghi kết quả SLA; mở lại', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-ticket="tk_2041"]').click();
    const d = page.getByTestId('tk-drawer');
    await d.getByTestId('tk-close').click();
    const box = page.getByTestId('tk-close-box');
    await expect(box.getByTestId('tk-close-ok')).toBeDisabled();
    await box.getByTestId('tk-close-reason').selectOption('resolved');
    await box.getByTestId('tk-close-ok').click();
    await expect(d.getByTestId('tk-status')).toHaveText('Đã đóng');
    await d.getByRole('tab', { name: 'SLA' }).click();
    await expect(d).toContainText('Vi phạm SLA');
    await d.getByTestId('tk-reopen').click();
    await d.getByRole('tab', { name: 'Chi tiết' }).click();
    await expect(d.getByTestId('tk-status')).toHaveText('Đang mở');
  });

  test('chọn nhiều → gán người phụ trách / AI xử lý / đổi ưu tiên (ticket.bulk_update)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-ticket="tk_2041"] input[type="checkbox"]').check();
    await page.locator('[data-ticket="tk_2034"] input[type="checkbox"]').check();
    await expect(page.getByTestId('tk-bulk')).toContainText('Đã chọn 2 ticket');
    await page.getByTestId('tk-bulk-assign').click();
    await page.getByRole('menuitem', { name: 'Minh' }).click();
    await expect(page.getByTestId('tk-bulk')).toHaveCount(0);
    await expect(page.locator('[data-ticket="tk_2041"]')).toContainText('Minh');
    await page.locator('[data-ticket="tk_2034"] input[type="checkbox"]').check();
    await page.getByTestId('tk-bulk-ai').click();
    await expect(page.locator('[data-ticket="tk_2034"]')).toContainText('AI Agent');
  });

  test('tạo ticket: bắt buộc tiêu đề, kênh chỉ Zalo cá nhân / Web chat / Email → mở drawer ticket mới', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('tk-create').click();
    const f = page.getByTestId('tk-form');
    await expect(f.getByTestId('tk-channel').locator('option')).toHaveText(['Zalo cá nhân', 'Web chat', 'Email']);
    await f.getByTestId('tk-save').click();
    await expect(f.getByTestId('tk-form-err')).toHaveText('Nhập tiêu đề ticket');
    await f.getByTestId('tk-title').fill('Khách hỏi xuất hoá đơn liệu trình');
    await f.getByTestId('tk-company').fill('Cty Hoà Bình');
    await f.getByTestId('tk-email').fill('ketoan@hoabinh.vn');
    await f.getByTestId('tk-channel').selectOption('email');
    await f.getByTestId('tk-category').selectOption('Billing');
    await f.getByTestId('tk-priority').selectOption('medium');
    await f.getByTestId('tk-desc').fill('Cần hoá đơn cho gói 10 buổi');
    await f.getByTestId('tk-save').click();
    const d = page.getByTestId('tk-drawer');
    await expect(d).toContainText('TKT-2042');
    await expect(d.getByTestId('tk-sla-left')).toHaveText('Còn 16h');
    await expect(page.locator('[data-ticket]')).toHaveCount(15);
  });

  test('390: thẻ ticket, drawer, form — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('tk-table').locator('[data-ticket]')).toHaveCount(14);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('tk-create'));
    await page.locator('[data-ticket="tk_2041"]').click();
    await expect(page.getByTestId('tk-sla-clock')).toBeVisible();
    await expectTouchTargets(page.getByTestId('tk-send'));
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('tk-drawer').getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.getByTestId('tk-create').click();
    await expect(page.getByTestId('tk-form')).toBeVisible();
    await expectTouchTargets(page.getByTestId('tk-save'));
    await expectNoHorizontalOverflow(page);
  });
});
