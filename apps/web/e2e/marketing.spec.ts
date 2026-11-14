import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

// TIP-037 (mock): cùng DTO với server — nút theo `allowed[]`, duyệt cần xác nhận, wizard chọn khách theo id thật + nhập danh sách, AI
// phân tích theo run (xếp hàng → xong), chi tiết người nhận theo trang server + xuất CSV + gửi lại tạo nháp; không có số mở / click giả.
const URL = '/marketing?session=authed,declared,trialSeen';

test.describe('marketing', () => {
  test('danh sách: 11 chiến dịch, tab kênh (chỉ Zalo cá nhân + Email), tab trạng thái, tìm không dấu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-campaign]')).toHaveCount(11);
    await expect(page.getByTestId('mk-kpis')).toBeVisible();
    await expect(page.getByTestId('mk-chan-sms')).toHaveCount(0);
    await page.getByTestId('mk-chan-email').click();
    await expect(page.getByTestId('mk-hero')).toContainText('Email Marketing');
    await expect(page.locator('[data-campaign]')).toHaveCount(4);
    await page.getByTestId('mk-chan-zalo').click();
    await expect(page.locator('[data-campaign]')).toHaveCount(7);
    await page.getByTestId('mk-chan-all').click();
    await page.getByTestId('mk-tab-running').click();
    await expect(page.locator('[data-campaign]')).toHaveCount(4);
    await page.getByTestId('mk-tab-all').click();
    await page.getByTestId('mk-search').fill('tri an khach');
    await expect(page.locator('[data-campaign]')).toHaveCount(1);
    await expect(page.locator('[data-campaign="cp_2111"]')).toBeVisible();
  });

  test('duyệt: Chờ duyệt → gửi thử → Duyệt & gửi qua hộp xác nhận → Hẹn giờ, lịch sử ghi sự kiện; từ chối cần lý do', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('mk-tab-pending_approval').click();
    await page.locator('[data-campaign="cp_2111"]').click();
    const d = page.getByTestId('mk-detail');
    await expect(d.getByTestId('mk-approval')).toContainText('3.820');
    await expect(d.getByTestId('mk-reject')).toBeDisabled();
    await d.getByTestId('mk-send-test').click();
    await expect(page.getByText('Đã gửi thử tới')).toBeVisible();
    await d.getByTestId('mk-approve').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(d.getByTestId('mk-row-status')).toHaveText('Hẹn giờ');
    await d.getByTestId('mk-dtab-history').click();
    await expect(d.getByTestId('mk-history')).toContainText('Được phê duyệt');
    await expect(d.getByTestId('mk-history')).toContainText('Gửi thử');
    await d.getByTestId('mk-detail-back').click();
    await page.getByTestId('mk-tab-scheduled').click();
    await expect(page.locator('[data-campaign="cp_2111"]')).toBeVisible();
  });

  test('menu dòng theo trạng thái: đang chạy không có Huỷ / Xoá; tạm dừng → tiếp tục; tạm dừng → huỷ → xoá', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const row = page.locator('[data-campaign="cp_2101"]');
    const open = () => row.getByRole('button', { name: 'Thao tác' }).click();
    await open();
    await expect(page.getByRole('menuitem', { name: 'Huỷ chiến dịch' })).toHaveCount(0);
    await expect(page.getByRole('menuitem', { name: 'Xoá chiến dịch' })).toHaveCount(0);
    await page.getByRole('menuitem', { name: 'Tạm dừng' }).click();
    await expect(row.getByTestId('mk-row-status')).toHaveText('Tạm dừng');
    await open();
    await page.getByRole('menuitem', { name: 'Tiếp tục' }).click();
    await expect(row.getByTestId('mk-row-status')).toHaveText('Đang chạy');
    await open();
    await page.getByRole('menuitem', { name: 'Tạm dừng' }).click();
    await open();
    await page.getByRole('menuitem', { name: 'Huỷ chiến dịch' }).click();
    await expect(row.getByTestId('mk-row-status')).toHaveText('Đã hủy');
    await open();
    await page.getByRole('menuitem', { name: 'Xoá chiến dịch' }).click();
    await expect(page.locator('[data-campaign]')).toHaveCount(10);
  });

  test('wizard thủ công: Email → chọn 2 khách theo id → AI viết lại giọng trang trọng → Gửi duyệt → Chờ duyệt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('mk-create').click();
    const w = page.getByTestId('mk-wizard');
    await w.getByTestId('mk-wiz-ch-email').click();
    await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-q').fill('Lan');
    await w.locator('[data-cust]').first().click();
    await w.getByTestId('mk-wiz-q').fill('');
    await w.locator('[data-cust]').nth(1).click();
    await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-name').fill('Email — Tri ân tháng 6');
    await w.getByTestId('mk-wiz-subject').fill('Quà tri ân tháng 6');
    await w.getByTestId('mk-wiz-body').fill('Chào {ten}, cảm ơn bạn đã đồng hành cùng Trâm Spa.');
    await w.getByTestId('mk-tone-formal').click();
    await expect(w.getByTestId('mk-wiz-body')).toHaveValue(/^Kính gửi quý khách \{ten\}, cảm ơn/);
    await w.getByTestId('mk-wiz-next').click();
    await expect(w.getByTestId('mk-wiz-aud')).toHaveText('2');
    await w.getByTestId('mk-wiz-submit').click();
    await expect(w).toHaveCount(0);
    await page.getByTestId('mk-tab-pending_approval').click();
    await expect(page.locator('[data-campaign]').filter({ hasText: 'Email — Tri ân tháng 6' })).toHaveCount(1);
  });

  test('wizard: nhập danh sách CSV → lô khách thật (đếm hợp lệ / lỗi), người nhận ước tính theo lô', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('mk-create').click();
    const w = page.getByTestId('mk-wizard');
    await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-file').setInputFiles({ name: 'ds.csv', mimeType: 'text/csv', buffer: Buffer.from('Tên,SĐT\nChị Lan Hương,0901234567\nKhách mới,0988000111\nKhông số,\n') });
    await expect(w.getByTestId('mk-wiz-uploaded')).toBeVisible();
    await expect(w.getByTestId('mk-wiz-uploaded')).toContainText('2');
    await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-name').fill('Từ danh sách');
    await w.getByTestId('mk-wiz-body').fill('Chào {ten}');
    await w.getByTestId('mk-wiz-next').click();
    await expect(w.getByTestId('mk-wiz-aud')).toHaveText('2');
  });

  test('AI phân tích: xếp hàng → đang chạy → 4 đề xuất → chi tiết → tạo chiến dịch điền sẵn → Lưu nháp; đề xuất Đã tạo', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('mk-analyze').click();
    const m = page.getByTestId('mk-analyze-modal');
    await m.getByTestId('mk-an-rerun').click();
    await expect(m.getByTestId('mk-an-running')).toBeVisible();
    await expect(m.locator('[data-suggestion]')).toHaveCount(4, { timeout: 15_000 });
    await m.locator('[data-suggestion]').first().click();
    await expect(m.getByTestId('mk-an-detail')).toContainText('Tái kích hoạt khách hàng cũ');
    await m.getByTestId('mk-an-create').click();
    const w = page.getByTestId('mk-wizard');
    await expect(w.getByTestId('mk-wiz-ai')).toContainText('Tái kích hoạt khách hàng cũ');
    for (let i = 0; i < 3; i++) await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-draft').click();
    await expect(w).toHaveCount(0);
    await page.getByTestId('mk-tab-draft').click();
    await expect(page.locator('[data-campaign]').filter({ hasText: 'Tái kích hoạt khách hàng cũ' })).toHaveCount(1);
    await page.getByTestId('mk-analyze').click();
    await expect(page.locator('[data-suggestion]').first()).toContainText('Đã tạo');
  });

  test('chi tiết: số đo từ bằng chứng (không mở / click), lọc người nhận theo pill, nội dung, xuất CSV, gửi lại tạo nháp', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-campaign="cp_2104"]').click();
    const d = page.getByTestId('mk-detail');
    await expect(d.locator('[data-rec]')).toHaveCount(8);
    await expect(d.getByTestId('mk-stat-open')).toHaveCount(0);
    await d.getByTestId('mk-pill-replied').click();
    await expect(d.locator('[data-rec]')).toHaveCount(3);
    await d.getByTestId('mk-pill-failed').click();
    await expect(d.locator('[data-rec]')).toHaveCount(1);
    await d.getByTestId('mk-dtab-content').click();
    await expect(d.getByTestId('mk-content')).toBeVisible();
    const dl = page.waitForEvent('download');
    await d.getByTestId('mk-export').click();
    expect((await dl).suggestedFilename()).toMatch(/\.csv$/);
    await d.getByTestId('mk-resend').click();
    await expect(page.getByText(/Đã tạo nháp CD-\d+/)).toBeVisible();
    await expect(page.getByTestId('mk-detail')).toContainText('gửi lại');
  });

  test('panel AI → gợi ý mở wizard điền sẵn; huỷ nhận tin công khai: token mẫu → xác nhận → đã huỷ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('mk-ai-open').click();
    await page.getByTestId('mk-ai-0').click();
    await expect(page.getByTestId('mk-wizard')).toBeVisible();
    await page.goto('/campaign/unsubscribe?t=unsub-demo');
    await page.getByTestId('unsub-confirm').click();
    await expect(page.getByTestId('unsub-done')).toBeVisible();
    await page.goto('/campaign/unsubscribe?t=sai');
    await expect(page.getByTestId('unsub-invalid')).toBeVisible();
  });

  test('390: thẻ chiến dịch, chi tiết, wizard — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.locator('[data-campaign]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('mk-create'));
    await expectTouchTargets(page.getByTestId('mk-chan-email'));
    await page.locator('[data-campaign="cp_2101"]').click();
    await expect(page.getByTestId('mk-detail')).toBeVisible();
    await expectTouchTargets(page.getByTestId('mk-detail-back'));
    await page.getByTestId('mk-detail-back').click();
    await page.getByTestId('mk-create').click();
    await expect(page.getByTestId('mk-wizard')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('mk-wiz-next'));
  });
});
