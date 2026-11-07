// TIP-042 (http — pnpm e2e:http): vai trò tuỳ biến + nhóm trên backend thật. Chủ sở hữu nhân bản Quản lý (quyền riêng Chủ sở hữu khoá),
// bỏ một quyền, tạo → tải lại thấy vai trò từ DB (tên DB, nhãn Tuỳ biến, cột ma trận) → sửa tên (CAS) → xoá (chưa ai dùng) → tải lại mất.
// Nhóm: gói dùng thử 1 người dùng → nhóm chỉ có Chủ sở hữu; tạo (trưởng nhóm thuộc nhóm) → tải lại → Cấu hình đổi tên + bỏ trưởng nhóm.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('vai trò & nhóm (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('vai trò tuỳ biến: nhân bản → tạo → đọc lại DB → sửa → xoá; nhóm: tạo → cấu hình', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'roles');

    await page.goto('/settings/roles');
    await expect(page.locator('[data-role]')).toHaveCount(5);
    await page.locator('[data-role="manager"]').getByTestId('st-role-clone').click();
    const ed = page.getByTestId('st-role-editor');
    await expect(ed.getByTestId('st-re-clone')).toHaveText('Dựa trên vai trò Quản lý');
    await expect(ed.locator('input[data-perm="billing.manage"]')).toBeDisabled();
    await ed.getByTestId('st-re-name').fill('Lễ tân ca tối');
    await ed.locator('input[data-perm="catalog.cost_view"]').uncheck();
    await ed.getByTestId('st-role-editor-save').click();
    await expect(ed).toHaveCount(0);

    await page.reload();
    const row = page.locator('[data-role^="custom:"]');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Lễ tân ca tối');
    await expect(row).toContainText('Tuỳ biến');
    await expect(page.locator('[data-perm="catalog.cost_view"] [data-yes]').last()).toHaveAttribute('data-yes', '0');
    await expect(page.locator('[data-perm="catalog.view"] [data-yes]').last()).toHaveAttribute('data-yes', '1');

    await row.getByTestId('st-role-edit').click();
    await ed.getByTestId('st-re-name').fill('Lễ tân');
    await ed.getByTestId('st-role-editor-save').click();
    await expect(ed).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-role^="custom:"]')).toContainText('Lễ tân');

    await page.locator('[data-role^="custom:"]').getByTestId('st-role-edit').click();
    page.once('dialog', (d) => void d.accept());
    await ed.getByTestId('st-re-delete').click();
    await expect(ed).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-role]')).toHaveCount(5);

    await page.goto('/settings/teams');
    await expect(page.getByTestId('st-teams-empty')).toBeVisible();
    await page.getByTestId('st-team-new').click();
    const te = page.getByTestId('st-team-editor');
    await te.getByTestId('st-te-name').fill('Nhóm Spa');
    const owner = te.locator('input[data-user]').first();
    await owner.check();
    const ownerId = await owner.getAttribute('data-user');
    await te.getByTestId('st-te-lead').selectOption(ownerId!);
    await te.getByTestId('st-team-editor-save').click();
    await expect(te).toHaveCount(0);

    await page.reload();
    const card = page.locator('[data-team]');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Nhóm Spa');
    await expect(card).toContainText('1 thành viên');
    await expect(card).toContainText('Trưởng nhóm:');

    await card.getByTestId('st-team-config').click();
    await te.getByTestId('st-te-name').fill('Nhóm Spa Q1');
    await te.getByTestId('st-te-lead').selectOption('');
    await te.getByTestId('st-team-editor-save').click();
    await expect(te).toHaveCount(0);
    await page.reload();
    await expect(card).toContainText('Nhóm Spa Q1');
    await expect(card).not.toContainText('Trưởng nhóm');
  });
});
