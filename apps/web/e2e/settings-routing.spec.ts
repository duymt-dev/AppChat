// TIP-042b (mock): Cài đặt › Chia lead — Chủ sở hữu thấy ghi chú "chỉ lead mới", rule mặc định chưa bật (thủ công); bật không chọn người
// → báo lỗi, chọn người → lưu, nhãn đổi "Xoay vòng"; tài khoản kênh theo mặc định; ghi đè một tài khoản bằng "Theo kênh" (người cố định).
// Drawer Quản lý kênh hiện rule đang áp + nút mở Chia lead; không còn lựa chọn "Theo ca". Quản lý (crm.reassign) vào được; CSKH (không
// crm.reassign) → mục ở trạng thái không có quyền (chỉ đọc ở drawer kênh kiểm ở e2e http — vai trò có channels.manage mà thiếu crm.reassign
// chỉ có ở vai trò tuỳ biến). Mobile 390: không tràn ngang.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const go = (section: string) => `/settings/${section}${S}`;
const asRole = async (page: Page, role: string) => {
  await page.evaluate((r) => localStorage.setItem('ac_mock_role', r), role);
  await page.reload();
};

test.describe('settings · chia lead (TIP-042b)', () => {
  test('bật xoay vòng ở rule mặc định → ghi đè tài khoản theo kênh → drawer kênh hiện rule đang áp', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('routing'));
    await expect(page.getByTestId('st-title')).toHaveText('Routing & assignment');
    await expect(page.getByTestId('st-rt-note')).toContainText('Chỉ áp cho lead MỚI');
    const def = page.locator('[data-rule="default"]');
    await expect(def.getByTestId('st-rt-status')).toHaveText('Thủ công · hàng chung');
    await expect(page.locator('[data-rule="acc_zalo_1"]').getByTestId('st-rt-status')).toHaveText('Theo mặc định');

    await def.getByTestId('st-rt-edit').click();
    const ed = page.getByTestId('st-rt-editor');
    await ed.getByTestId('st-rt-enabled').click();
    await ed.getByTestId('st-rt-mode').selectOption('round_robin');
    await ed.getByTestId('st-rt-editor-save').click();
    await expect(page.getByText('Chọn ít nhất một người nhận')).toBeVisible();
    await ed.locator('input[data-user="u_huyen"]').check();
    await ed.locator('input[data-user="u_tram"]').check();
    await ed.getByTestId('st-rt-editor-save').click();
    await expect(ed).toHaveCount(0);
    await expect(def.getByTestId('st-rt-status')).toHaveText('Xoay vòng (chia đều)');

    const zalo = page.locator('[data-rule="acc_zalo_1"]');
    await zalo.getByTestId('st-rt-edit').click();
    await expect(ed.getByTestId('st-rt-mode').locator('option[value="by_channel"]')).toHaveCount(1);
    await ed.getByTestId('st-rt-enabled').click();
    await ed.getByTestId('st-rt-mode').selectOption('by_channel');
    await ed.getByTestId('st-rt-fixed').selectOption('u_huyen');
    await ed.getByTestId('st-rt-editor-save').click();
    await expect(ed).toHaveCount(0);
    await expect(zalo.getByTestId('st-rt-status')).toHaveText('Theo kênh (người cố định)');

    // Kênh: drawer khối Phân công hiện rule đang áp, không còn ô "Cách chia" cũ (Theo ca).
    await page.getByTestId('st-nav-channels').click();
    await page.getByTestId('st-ch-zalo_personal').click();
    const drawer = page.getByTestId('st-ch-drawer');
    await drawer.getByTestId(/^st-ch-drawer-acct-/).first().click();
    await expect(drawer.getByTestId('st-ch-drawer-routing-status')).toHaveText('Riêng tài khoản · Theo kênh (người cố định)');
    await expect(drawer.getByTestId('st-ch-drawer-assign')).toHaveCount(0);
    await expect(drawer.getByTestId('st-ch-drawer-routing-open')).toBeVisible();
  });

  test('Quản lý thấy mục Chia lead; CSKH (không crm.reassign) → không có quyền', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('routing'));
    await asRole(page, 'manager');
    await expect(page.locator('[data-rule="default"]')).toBeVisible();
    await asRole(page, 'cs');
    await expect(page.locator('[data-rule="default"]')).toHaveCount(0);
    await expect(page.locator('.ant-result-403')).toBeVisible();
  });

  test('mobile 390: mục Chia lead + trình sửa không tràn ngang', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(go('routing'));
    await expect(page.locator('[data-rule="default"]')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('[data-rule="default"]').getByTestId('st-rt-edit').click();
    await expect(page.getByTestId('st-rt-editor')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
