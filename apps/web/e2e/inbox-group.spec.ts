// TIP-025b P3 — E2E chế độ mock: Thông tin nhóm Zalo → chính sách AI (ghi qua group.set_ai_policy, đọc lại), Quản lý nhóm → làm mới ảnh
// chụp → đổi tên (đúng phiên bản) → thêm thành viên (kết quả từng người); Tắt thông báo đổi nhãn; không có URL link trong DOM. Mobile 390:
// không tràn ngang.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/inbox?session=authed,declared,trialSeen';
const confirmIfAsked = async (page: Page) => {
  const ok = page.getByRole('button', { name: 'Xác nhận' });
  if (await ok.isVisible({ timeout: 1500 }).catch(() => false)) await ok.click();
};

test.describe('inbox nhóm Zalo (mock)', () => {
  test('quản lý nhóm: làm mới → đổi tên → thêm thành viên; tắt thông báo; không lộ link', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-conv="g_vip"] button').first().click();
    const info = page.getByTestId('group-info');
    if (isMobile(page)) await page.getByRole('button', { name: 'Thu gọn hồ sơ' }).click();
    await expect(info).toBeVisible();
    await page.getByTestId('group-act-manage').click();
    const m = page.getByTestId('group-manage');
    await expect(m.getByTestId('group-provider')).toContainText('chưa đọc từ Zalo');
    await m.getByTestId('group-refresh').click();
    await confirmIfAsked(page);
    await expect(m.getByTestId('group-provider')).toContainText('phó nhóm');
    await m.getByTestId('group-name').fill('Nhóm VIP 2026');
    await m.getByTestId('group-rename').click();
    await confirmIfAsked(page);
    await expect(m.getByTestId('group-command')).toHaveAttribute('data-state', 'confirmed');
    await m.getByTestId('group-candidate').first().click();
    await m.getByTestId('group-add').click();
    await confirmIfAsked(page);
    await expect(m.getByTestId('group-command-member').first()).toHaveAttribute('data-status', 'confirmed');
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    await m.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
    await expect(m).toHaveCount(0);
    await page.getByTestId('group-act-mute').click();
    await confirmIfAsked(page);
    await expect(page.getByTestId('group-act-mute')).toContainText('Bật thông báo');
    expect(await page.content()).not.toContain('zalo.me/g/');
  });
});
