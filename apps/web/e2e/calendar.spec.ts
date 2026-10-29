import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/calendar?session=authed,declared,trialSeen';

test.describe('calendar', () => {
  test('danh sách hôm nay: 6 lịch + 2 follow-up xen theo giờ, KPI, lọc KTV + tìm', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-appt]')).toHaveCount(6);
    await expect(page.locator('[data-follow]')).toHaveCount(2);
    await expect(page.getByTestId('cal-kpi-today')).toHaveText('6');
    await page.getByTestId('cal-f-staff').selectOption('s3');
    await expect(page.locator('[data-appt]')).toHaveCount(2);
    await page.getByTestId('cal-f-staff').selectOption('all');
    await page.getByTestId('cal-search').fill('mai tram');
    await expect(page.locator('[data-appt]')).toHaveCount(1);
    await expect(page.locator('[data-appt="ap_1215"]')).toBeVisible();
    await page.getByTestId('cal-search').fill('');
    await page.locator('[data-follow="cfu_1"]').getByTestId('cal-fu-done').click();
    await expect(page.locator('[data-follow]')).toHaveCount(1);
  });

  test('4 chế độ xem: Danh sách · Ngày (làn KTV) · Tuần · Tháng → bấm ngày về Ngày', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('cal-view-day').click();
    await expect(page.getByTestId('cal-day')).toBeVisible();
    await expect(page.getByTestId('cal-day').locator('[data-appt]')).toHaveCount(6);
    await page.getByTestId('cal-view-week').click();
    await expect(page.getByTestId('cal-week')).toBeVisible();
    await page.getByTestId('cal-view-month').click();
    await expect(page.getByTestId('cal-month-title')).toHaveText('Tháng 6 · 2026');
    await page.locator('[data-day="2026-06-26"]').click();
    await expect(page.getByTestId('cal-day')).toBeVisible();
    await expect(page.getByTestId('cal-day').locator('[data-appt]')).toHaveCount(2);
  });

  test('vòng đời: Chờ → Xác nhận → Khách đã đến → Hoàn thành; ngoài liệu trình → gợi ý tạo đơn (8b)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-appt="ap_1215"]').click();
    const d = page.getByTestId('cal-drawer');
    await expect(d.getByTestId('cal-status')).toHaveText('Chờ xác nhận');
    await d.getByTestId('cal-confirm').click();
    await expect(d.getByTestId('cal-status')).toHaveText('Đã xác nhận');
    await d.getByTestId('cal-checkin').click();
    await expect(d.getByTestId('cal-status')).toHaveText('Đã đến');
    await d.getByTestId('cal-complete').click();
    await expect(d.getByTestId('cal-status')).toHaveText('Hoàn thành');
    await expect(d.getByTestId('cal-suggest')).toContainText('Tạo đơn cho buổi này?');
  });

  test('liệu trình: hoàn thành buổi trong gói → trừ 1 buổi, không gợi ý đơn', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-appt="ap_1210"]').click();
    const d = page.getByTestId('cal-drawer');
    await expect(d.getByTestId('cal-package')).toContainText('5/10');
    await d.getByTestId('cal-checkin').click();
    await d.getByTestId('cal-complete').click();
    await expect(page.getByText('Đã trừ 1 buổi liệu trình (6/10)')).toBeVisible();
    await expect(d.getByTestId('cal-package')).toContainText('6/10');
    await expect(d.getByTestId('cal-suggest')).toHaveCount(0);
  });

  test('Không đến / Huỷ (bắt buộc lý do) qua menu ⋯', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-appt="ap_1214"]').click();
    const d = page.getByTestId('cal-drawer');
    await d.getByRole('button', { name: 'Thao tác khác' }).click();
    await page.getByText('Huỷ lịch hẹn', { exact: true }).click();
    const box = page.getByTestId('cal-cancel');
    await expect(box.getByTestId('cal-cancel-ok')).toBeDisabled();
    await box.getByTestId('cal-cancel-reason').fill('Khách bận đột xuất');
    await box.getByTestId('cal-cancel-ok').click();
    await expect(d.getByTestId('cal-status')).toHaveText('Đã huỷ');
    await expect(d).toContainText('Khách bận đột xuất');
  });

  test('tạo lịch: giờ chọn từ slot trống, giờ kết thúc theo thời lượng; trùng → CONFLICT; đổi giờ giữ mã', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('cal-create').click();
    const f = page.getByTestId('cal-form');
    await f.getByTestId('cal-save').click();
    await expect(f.getByTestId('cal-form-err')).toContainText('Nhập tên khách');
    await f.getByTestId('cal-customer').fill('Ngô Bảo Ngọc');
    await f.getByTestId('cal-service').selectOption('sv2');
    await f.getByTestId('cal-date').fill('2026-06-24');
    await f.getByTestId('cal-staff').selectOption('s2');
    // 09:00–10:40 KTV Mai Lan đã bận (Lan Hương) → không có trong danh sách slot
    await expect(f.getByTestId('cal-start').locator('option[value="09:30"]')).toHaveCount(0);
    await f.getByTestId('cal-start').selectOption('12:00');
    await expect(f.getByTestId('cal-end')).toHaveValue('13:00');
    await f.getByTestId('cal-st').selectOption('confirmed');
    await f.getByTestId('cal-save').click();
    const d = page.getByTestId('cal-drawer');
    await expect(d.getByTestId('cal-status')).toHaveText('Đã xác nhận');
    await expect(d.getByTestId('cal-time')).toContainText('12:00');
    await expect(page.locator('[data-appt]')).toHaveCount(7);
    await d.getByTestId('cal-reschedule').click();
    await f.getByTestId('cal-start').selectOption('13:00');
    await f.getByTestId('cal-save').click();
    await expect(d.getByTestId('cal-time')).toContainText('13:00');
  });

  test('390: danh sách, drawer, form — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.locator('[data-appt]')).toHaveCount(6);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('cal-create'));
    await page.getByTestId('cal-view-day').click();
    await expect(page.getByTestId('cal-day')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('cal-view-list').click();
    await page.locator('[data-appt="ap_1215"]').click();
    await expectTouchTargets(page.getByTestId('cal-confirm'));
    await page.getByTestId('cal-confirm').click();
    await expect(page.getByTestId('cal-status')).toHaveText('Đã xác nhận');
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('cal-drawer').getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('cal-create').click();
    await expect(page.getByTestId('cal-form')).toBeVisible();
    await expectTouchTargets(page.getByTestId('cal-save'));
    await expectNoHorizontalOverflow(page);
  });
});
