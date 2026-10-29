import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const go = (section: string) => `/settings/${section}${S}`;

test.describe('settings · SLA & thông báo', () => {
  test('SLA: chỉ chính sách mặc định, sửa ngưỡng (kiểm lỗi), đổi ngày làm việc, leo thang', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('org_sla'));
    await expect(page.locator('[data-sla]')).toHaveCount(1);
    await expect(page.getByTestId('st-sla-new')).toBeDisabled();
    const row = page.locator('[data-sla="default"]');
    await expect(row).toContainText('Tức thì');
    await expect(row).toContainText('10\'');
    await page.getByTestId('st-sla-edit').click();
    const m = page.getByTestId('st-sla-modal');
    await m.getByTestId('st-sla-frt_human').fill('0');
    await m.getByRole('button', { name: 'Lưu chính sách' }).click();
    await expect(page.getByText('Nhập số phút hợp lệ')).toBeVisible();
    await m.getByTestId('st-sla-frt_human').fill('20');
    await m.getByTestId('st-sla-ttr_human').fill('60');
    await m.getByRole('button', { name: 'Lưu chính sách' }).click();
    await expect(m).toBeHidden();
    await expect(row).toContainText('20\'');
    await expect(row).toContainText('1h');
    await expect(page.locator('[data-day="6"]')).toContainText('Nghỉ');
    await page.getByTestId('st-sla-day-6').click();
    await expect(page.locator('[data-day="6"]')).toContainText('Mở');
    await page.getByTestId('st-sla-esc-vip_wait').click();
    await expect(page.getByTestId('st-sla-esc-vip_wait')).toHaveAttribute('aria-checked', 'true');
  });

  test('SLA: vai trò không có sla.manage không vào được mục', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('org_sla'));
    await page.evaluate(() => localStorage.setItem('ac_mock_role', 'sales'));
    await page.reload();
    await expect(page.getByText('Bạn không có quyền xem mục này')).toBeVisible();
    await expect(page.locator('[data-sla]')).toHaveCount(0);
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('Thông báo: bật / tắt theo kênh, Không làm phiền + khung giờ, email tóm tắt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('notifications'));
    await expect(page.locator('[data-event]')).toHaveCount(9);
    await expect(page.getByText('Workflow')).toHaveCount(0);
    const sw = page.getByTestId('st-notif-msg_mention-email');
    const before = await sw.getAttribute('aria-checked');
    await sw.click();
    await expect(sw).not.toHaveAttribute('aria-checked', before ?? '');
    await expect(page.getByLabel('Từ', { exact: true })).toHaveCount(0);
    await page.getByTestId('st-notif-dnd').click();
    await expect(page.getByLabel('Từ', { exact: true })).toHaveValue('22:00');
    await page.getByTestId('st-notif-digest').selectOption('weekly');
    await expect(page.getByTestId('st-notif-digest')).toHaveValue('weekly');
  });

  test('390: SLA + hộp sửa, Thông báo — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(go('org_sla'));
    await expect(page.locator('[data-sla]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-sla-day-0'));
    await page.getByTestId('st-sla-edit').click();
    await expect(page.getByTestId('st-sla-modal')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('notifications'));
    await expect(page.locator('[data-event]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-notif-digest'));
  });
});
