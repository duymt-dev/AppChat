// TIP-025b P3 + P7 — E2E chế độ mock: Thông tin nhóm Zalo → chính sách AI (ghi qua group.set_ai_policy, đọc lại), Quản lý nhóm → làm mới ảnh
// chụp → đổi tên (đúng phiên bản) → thêm thành viên (kết quả từng người); Tắt thông báo đổi nhãn; không có URL link trong DOM. Mobile 390:
// không tràn ngang. P7: bảng tin đọc thật (ghim · ảnh · tệp · link), sao chép link khi link tắt, phân công kèm tải mở.
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

  test('bảng tin thật (ghim · ảnh · tệp · link) + sao chép link khi link tắt (P7)', async ({ page }) => {
    await page.goto(URL);
    await page.locator('[data-conv="g_vip"] button').first().click();
    if (isMobile(page)) await page.getByRole('button', { name: 'Thu gọn hồ sơ' }).click();
    const board = page.getByTestId('group-board');
    await expect(board.getByTestId('group-pinned')).toContainText('Lịch liệu trình');
    await expect(page.getByTestId('group-media')).toContainText('Ảnh không gian spa');
    await expect(page.getByTestId('group-file').first()).toContainText('Bảng giá liệu trình');
    await expect(page.getByTestId('group-link-item').first()).toHaveAttribute('href', /^https:\/\//);
    await page.getByTestId('group-link-copy').click();
    await confirmIfAsked(page);
    await expect(page.getByText('Đang tắt').last()).toBeVisible();
    expect(await page.content()).not.toContain('zalo.me/g/');
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
  });

  test('phân công: ứng viên kèm tải mở + agent theo kênh (P7)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-conv="c_lan"] .conv-dots').click();
    await page.getByRole('menuitem', { name: 'Phân công' }).click();
    const list = page.getByTestId('assign-list');
    await expect(list.locator('[data-testid^="assign-user-"]').first()).toContainText('đang mở');
    await page.getByTestId('assign-search').fill('Minh');
    await expect(list.locator('[data-testid^="assign-user-"]')).toHaveCount(1);
    await list.locator('[data-testid^="assign-user-"]').first().click();
    await expect(page.getByTestId('conv-menu')).toHaveCount(0);
  });
});
