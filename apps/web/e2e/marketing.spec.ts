import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

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

  test('duyệt chiến dịch: Chờ duyệt → Duyệt & gửi luôn qua hộp xác nhận → Đang chạy, lịch sử ghi sự kiện', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('mk-tab-pending_approval').click();
    await page.locator('[data-campaign="cp_2111"]').click();
    const d = page.getByTestId('mk-detail');
    await expect(d.getByTestId('mk-approval')).toContainText('3.820');
    await d.getByTestId('mk-send-test').click();
    await expect(page.getByText('Đã gửi thử tới')).toBeVisible();
    await d.getByTestId('mk-approve').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(d.getByTestId('mk-row-status')).toHaveText('Hẹn giờ');
    await d.getByTestId('mk-dtab-history').click();
    await expect(d.getByTestId('mk-history')).toContainText('Được phê duyệt');
    await d.getByTestId('mk-detail-back').click();
    await page.getByTestId('mk-tab-scheduled').click();
    await expect(page.locator('[data-campaign="cp_2111"]')).toBeVisible();
  });

  test('menu dòng: tạm dừng → tiếp tục; huỷ rồi xoá', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const row = page.locator('[data-campaign="cp_2101"]');
    await row.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Tạm dừng' }).click();
    await expect(row.getByTestId('mk-row-status')).toHaveText('Tạm dừng');
    await row.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Tiếp tục' }).click();
    await expect(row.getByTestId('mk-row-status')).toHaveText('Đang chạy');
    await row.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Huỷ chiến dịch' }).click();
    await expect(row.getByTestId('mk-row-status')).toHaveText('Đã hủy');
    await row.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Xoá chiến dịch' }).click();
    await expect(page.locator('[data-campaign]')).toHaveCount(10);
  });

  test('wizard thủ công: Email → chọn khách → AI soạn → Gửi duyệt → Chờ duyệt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('mk-create').click();
    const w = page.getByTestId('mk-wizard');
    await w.getByTestId('mk-wiz-ch-email').click();
    await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-q').fill('Lan');
    await w.locator('[data-cust]').first().click();
    await w.getByTestId('mk-wiz-q').fill('');
    await w.locator('[data-cust="2"]').click();
    await w.getByRole('button', { name: 'Tiếp tục soạn nội dung' }).click();
    await w.getByTestId('mk-wiz-name').fill('Email — Tri ân tháng 6');
    await w.getByTestId('mk-wiz-subject').fill('Quà tri ân tháng 6');
    await w.getByTestId('mk-tone-luxury').click();
    await expect(w.getByTestId('mk-wiz-body')).toHaveValue(/Kính gửi quý khách \{Tên\}/);
    await w.getByTestId('mk-wiz-next').click();
    await expect(w.getByTestId('mk-wiz-aud')).toHaveText('2');
    await w.getByTestId('mk-wiz-submit').click();
    await expect(w).toHaveCount(0);
    await page.getByTestId('mk-tab-pending_approval').click();
    await expect(page.locator('[data-campaign]').filter({ hasText: 'Email — Tri ân tháng 6' })).toHaveCount(1);
  });

  test('AI phân tích → chi tiết đề xuất → tạo chiến dịch điền sẵn → Lưu nháp; đề xuất đánh dấu Đã tạo', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('mk-analyze').click();
    const m = page.getByTestId('mk-analyze-modal');
    await expect(m.locator('[data-suggestion]')).toHaveCount(4);
    await m.locator('[data-suggestion="sg_1"]').click();
    await expect(m.getByTestId('mk-an-detail')).toContainText('8–12%');
    await m.getByTestId('mk-an-create').click();
    const w = page.getByTestId('mk-wizard');
    await expect(w.getByTestId('mk-wiz-ai')).toContainText('Tái kích hoạt khách hàng cũ');
    for (let i = 0; i < 3; i++) await w.getByTestId('mk-wiz-next').click();
    await expect(w.getByTestId('mk-wiz-aud')).toHaveText('540');
    await w.getByTestId('mk-wiz-draft').click();
    await expect(w).toHaveCount(0);
    await page.getByTestId('mk-tab-draft').click();
    await expect(page.locator('[data-campaign]').filter({ hasText: 'Tái kích hoạt khách hàng cũ' })).toHaveCount(1);
    await page.getByTestId('mk-analyze').click();
    await expect(page.locator('[data-suggestion="sg_1"]')).toContainText('Đã tạo');
  });

  test('chi tiết: lọc người nhận theo pill, tab nội dung; panel AI mở wizard', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-campaign="cp_2101"]').click();
    const d = page.getByTestId('mk-detail');
    await expect(d.locator('[data-rec]')).toHaveCount(8);
    await d.getByTestId('mk-pill-clicked').click();
    await expect(d.locator('[data-rec]')).toHaveCount(3);
    await d.getByTestId('mk-dtab-content').click();
    await expect(d.getByTestId('mk-content')).toContainText('voucher 30%');
    await d.getByTestId('mk-detail-back').click();
    await page.getByTestId('mk-ai-open').click();
    await page.getByTestId('mk-ai-0').click();
    await expect(page.getByTestId('mk-wizard')).toBeVisible();
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
