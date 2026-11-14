import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/loyalty?session=authed,declared,trialSeen';

test.describe('loyalty', () => {
  test('danh sách: 5 thành viên, lọc hạng, tìm không dấu theo tên / SĐT', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-member]')).toHaveCount(5);
    await page.getByTestId('ly-f-tier').selectOption('gold');
    await expect(page.locator('[data-member]')).toHaveCount(2);
    await page.getByTestId('ly-f-tier').selectOption('all');
    await page.getByTestId('ly-search').fill('do thu ha');
    await expect(page.locator('[data-member]')).toHaveCount(1);
    await expect(page.locator('[data-member="ct_ha"]')).toBeVisible();
    await page.getByTestId('ly-search').fill('0909');
    await expect(page.locator('[data-member="ct_ducanh"]')).toBeVisible();
  });

  test('cộng điểm thành viên có sẵn: Bạc → Vàng khi tích đủ 15.000 điểm 12 tháng (COMMERCE §7)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('ly-add').click();
    const m = page.getByTestId('ly-adjust');
    await m.getByTestId('ly-adj-phone').fill('0987 654 321');
    await m.getByTestId('ly-adj-lookup').click();
    await expect(m.getByTestId('ly-adj-found')).toContainText('Đỗ Thu Hà');
    await m.getByTestId('ly-adj-points').fill('5200');
    await expect(m.getByTestId('ly-adj-tier-after')).toHaveText('Vàng');
    await expect(m.getByTestId('ly-adj-balance')).toHaveText('9.400');
    await m.getByTestId('ly-adj-save').click();
    await expect(m).toHaveCount(0);
    const row = page.locator('[data-member="ct_ha"]');
    await expect(row.getByTestId('ly-tier')).toContainText('Vàng');
    await expect(row.getByTestId('ly-points')).toContainText('9.400');
  });

  test('khách mới: tạo liên hệ CRM rồi ghi điểm → thành viên mới trong danh sách', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('ly-add').click();
    const m = page.getByTestId('ly-adjust');
    await m.getByTestId('ly-adj-phone').fill('0911 222 333');
    await m.getByTestId('ly-adj-lookup').click();
    await expect(m.getByTestId('ly-adj-new')).toBeVisible();
    await m.getByTestId('ly-adj-name').fill('Lê Minh Thư');
    await m.getByTestId('ly-adj-points').fill('300');
    await m.getByTestId('ly-adj-save').click();
    await expect(m).toHaveCount(0);
    await expect(page.locator('[data-member]')).toHaveCount(6);
    await expect(page.locator('[data-member]').filter({ hasText: 'Lê Minh Thư' })).toHaveCount(1);
  });

  test('trừ quá số dư bị chặn, hộp vẫn mở', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('ly-add').click();
    const m = page.getByTestId('ly-adjust');
    await m.getByTestId('ly-adj-phone').fill('0909 876 543');
    await m.getByTestId('ly-adj-lookup').click();
    await m.getByTestId('ly-adj-dir').selectOption('minus');
    await m.getByTestId('ly-adj-points').fill('9999');
    await m.getByTestId('ly-adj-save').click();
    await expect(m).toBeVisible();
    await m.getByRole('button', { name: 'Huỷ' }).click();
    await expect(page.locator('[data-member="ct_ducanh"]').getByTestId('ly-points')).toContainText('3.100');
  });

  test('cấu hình hạng lưu được; thử nghiệm tính điểm Vàng 2.000.000đ = 300 điểm', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.locator('[data-rule]')).toHaveCount(8);
    await page.getByTestId('ly-config-open').click();
    const c = page.getByTestId('ly-config');
    await c.getByTestId('ly-cfg-mult-diamond').fill('2.5');
    await c.getByTestId('ly-cfg-save').click();
    await expect(c).toHaveCount(0);
    await expect(page.getByText('Đã lưu cấu hình khách thân thiết')).toBeVisible();
    await page.getByTestId('ly-sim-open').click();
    const s = page.getByTestId('ly-sim');
    await s.getByTestId('ly-sim-tier').selectOption('gold');
    await s.getByTestId('ly-sim-amount').fill('2000000');
    await expect(s.getByTestId('ly-sim-total')).toHaveText('300');
    await s.getByTestId('ly-sim-tier').selectOption('diamond');
    await expect(s.getByTestId('ly-sim-total')).toHaveText('500');
  });

  test('drawer thành viên: hạng, điểm, 5 tab, lịch sử điểm; điều chỉnh từ drawer', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-member="ct_lan"]').click();
    const d = page.getByTestId('ly-drawer');
    await expect(d.getByTestId('ly-dr-tier')).toContainText('Kim cương');
    await expect(d.getByTestId('ly-dr-points')).toHaveText('24.800');
    await d.getByRole('tab', { name: 'CRM' }).click();
    await expect(d.locator('[data-rung]')).toHaveCount(4);
    await d.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(d.locator('[data-ledger]').first()).toBeVisible();
    await d.getByRole('tab', { name: 'Tổng quan' }).click();
    await d.getByTestId('ly-dr-adjust').click();
    await expect(page.getByTestId('ly-adj-phone')).toHaveValue('0903 123 456');
  });

  test('TIP-036: tab Tệp tải lên → có trong danh sách; tab AI gửi lượt Trợ lý; churn "Sắp có" không có nút giả', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await expect(page.getByTestId('ly-churn-soon')).toBeVisible();
    await expect(page.getByTestId('ly-churn').getByRole('button')).toHaveCount(0);
    await page.locator('[data-member="ct_ha"]').click();
    const d = page.getByTestId('ly-drawer');
    await d.getByRole('tab', { name: 'Tệp' }).click();
    await expect(d.locator('[data-file]')).toHaveCount(0);
    await d.getByTestId('ly-file-input').setInputFiles({ name: 'Phiếu quà.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 loyalty') });
    await expect(d.locator('[data-file]')).toHaveCount(1);
    await expect(d.locator('[data-file]')).toContainText('Phiếu quà.pdf');
    await d.getByRole('tab', { name: 'AI' }).click();
    await expect(d.getByTestId('ly-ai-insight')).toBeVisible();
    await d.getByTestId('ly-ai-act-keep').click();
    await expect(d.getByTestId('ly-ai-msgs')).toBeVisible();
  });

  test('390: thẻ thành viên, drawer, hộp ghi điểm — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.locator('[data-member]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('ly-add'));
    await page.locator('[data-member="ct_lan"]').click();
    await expect(page.getByTestId('ly-drawer')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('ly-drawer').getByRole('button', { name: 'Đóng' }).first().click();
    await page.getByTestId('ly-add').click();
    await expect(page.getByTestId('ly-adjust')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('ly-adj-lookup'));
  });
});
