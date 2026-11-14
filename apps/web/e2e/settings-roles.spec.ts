// TIP-042 (mock): vai trò tuỳ biến + nhóm — Chủ sở hữu nhân bản Quản lý (nhãn "dựa trên"), chỉnh quyền, tạo; vai trò mới xuất hiện ở danh
// sách + ma trận + chọn được khi đổi vai trò thành viên (badge = tên DB); quyền riêng Chủ sở hữu khoá; xoá khi còn người dùng báo số lượng.
// Nhóm: tạo (thành viên + trưởng nhóm), đổi thành viên (trưởng nhóm khoá), cấu hình. Quản lý không tạo được vai trò; Nhân viên không vào Nhóm.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const go = (section: string) => `/settings/${section}${S}`;
const asRole = async (page: Page, role: string) => {
  await page.evaluate((r) => localStorage.setItem('ac_mock_role', r), role);
  await page.reload();
};

test.describe('settings · vai trò & nhóm (TIP-042)', () => {
  test('vai trò tuỳ biến: nhân bản → chỉnh quyền → tạo → gán thành viên → xoá bị chặn khi còn người', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('roles'));
    await page.locator('[data-role="manager"]').getByTestId('st-role-clone').click();
    const ed = page.getByTestId('st-role-editor');
    await expect(ed.getByTestId('st-re-clone')).toHaveText('Dựa trên vai trò Quản lý');
    await expect(ed.getByTestId('st-re-name')).toHaveValue('Quản lý (bản sao)');
    await ed.getByTestId('st-re-name').fill('Lễ tân ca tối');
    // DC-298: quyền riêng Chủ sở hữu khoá, không bật được.
    await expect(ed.locator('input[data-perm="billing.manage"]')).toBeDisabled();
    await ed.locator('input[data-perm="catalog.cost_view"]').uncheck();
    await ed.getByTestId('st-re-scope-crm').selectOption('own');
    await ed.getByTestId('st-role-editor-save').click();
    await expect(ed).toHaveCount(0);
    const row = page.locator('[data-role^="custom:"]');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Lễ tân ca tối');
    await expect(row).toContainText('Tuỳ biến');
    // Cột cuối ma trận = vai trò mới: bỏ "Xem giá vốn", giữ "Xem sản phẩm" như Quản lý.
    await expect(page.locator('[data-perm="catalog.cost_view"] [data-yes]').last()).toHaveAttribute('data-yes', '0');
    await expect(page.locator('[data-perm="catalog.view"] [data-yes]').last()).toHaveAttribute('data-yes', '1');

    // Mock giữ trạng thái trong trang — chuyển mục bằng nav (goto tải lại sẽ về dữ liệu gốc).
    await page.getByTestId('st-nav-members').click();
    const huong = page.locator('[data-member="u_huong"]');
    await huong.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Sửa thông tin' }).click();
    await page.getByTestId('st-mm-role').selectOption({ label: 'Lễ tân ca tối' });
    await page.getByTestId('st-member-modal-save').click();
    await expect(huong.getByTestId('st-member-role')).toHaveText('Lễ tân ca tối');

    await page.getByTestId('st-nav-roles').click();
    await page.locator('[data-role^="custom:"]').getByTestId('st-role-edit').click();
    page.once('dialog', (d) => void d.accept());
    await page.getByTestId('st-re-delete').click();
    await expect(page.getByText('Vai trò đang dùng (1 thành viên, 0 lời mời)')).toBeVisible();
    await expect(page.getByTestId('st-role-editor')).toBeVisible();
  });

  test('nhóm: tạo (trưởng nhóm thuộc nhóm) → thành viên (trưởng nhóm khoá) → cấu hình', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('teams'));
    await expect(page.getByTestId('st-title')).toHaveText('Nhóm');
    await expect(page.locator('[data-team]')).toHaveCount(12);
    await page.getByTestId('st-team-search').fill('khong co nhom nay');
    await expect(page.getByTestId('st-teams-empty')).toHaveText('Không có nhóm khớp');
    await page.getByTestId('st-team-search').fill('');
    await page.getByTestId('st-team-new').click();
    const ed = page.getByTestId('st-team-editor');
    await ed.getByTestId('st-te-name').fill('Nhóm Spa');
    await ed.locator('input[data-user="u_huyen"]').check();
    await ed.locator('input[data-user="u_huong"]').check();
    await ed.getByTestId('st-te-lead').selectOption('u_huyen');
    await ed.getByTestId('st-team-editor-save').click();
    await page.getByTestId('st-team-search').fill('spa');
    const card = page.locator('[data-team]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Nhóm Spa');
    await expect(card).toContainText('2 thành viên');
    await expect(card).toContainText('Trưởng nhóm: Đỗ Thị Huyền');

    await card.getByTestId('st-team-members').click();
    await expect(ed.locator('input[data-user="u_huyen"]')).toBeDisabled();
    await ed.locator('input[data-user="u_khanh"]').check();
    await ed.getByTestId('st-team-editor-save').click();
    await expect(card).toContainText('3 thành viên');

    await card.getByTestId('st-team-config').click();
    await ed.getByTestId('st-te-name').fill('Nhóm Spa Q1');
    await ed.getByTestId('st-te-lead').selectOption('');
    await ed.getByTestId('st-team-editor-save').click();
    await expect(card).toContainText('Nhóm Spa Q1');
    await expect(card).not.toContainText('Trưởng nhóm');
  });

  test('quyền: Quản lý không tạo vai trò; Nhân viên không vào Nhóm', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('roles'));
    await asRole(page, 'manager');
    await expect(page.getByTestId('st-role-new')).toBeDisabled();
    await expect(page.getByTestId('st-role-clone')).toHaveCount(0);
    await page.goto(go('teams'));
    await expect(page.getByTestId('st-team-new')).toBeVisible();
    await asRole(page, 'sales');
    await expect(page.getByTestId('st-team-new')).toHaveCount(0);
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('mobile 390: Nhóm + trình sửa vai trò không tràn ngang', async ({ page }) => {
    test.skip(!isMobile(page), 'luồng mobile');
    await page.goto(go('teams'));
    await expect(page.getByTestId('st-team-new')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('roles'));
    await page.getByTestId('st-role-new').click();
    await expect(page.getByTestId('st-role-editor')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
