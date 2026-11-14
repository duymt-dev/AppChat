import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';

test.describe('Hồ sơ của tôi', () => {
  test('mở từ menu avatar, sửa tên + SĐT (profile.update), email chỉ đọc, đăng xuất', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/dashboard${S}`);
    await page.getByTestId('rail-user').click();
    await page.getByText('Hồ sơ của tôi').click();
    await expect(page).toHaveURL(/\/settings\/profile/);
    await expect(page.getByTestId('st-profile-name')).toHaveText('Thùy Trâm');
    await expect(page.getByLabel('Email đăng nhập')).toBeDisabled();
    await page.getByTestId('st-profile-name-input').fill('Nguyễn Thùy Trâm');
    await page.getByTestId('st-profile-phone').fill('+84 90 771 9999');
    await page.getByTestId('st-profile-save').click();
    await expect(page.getByTestId('st-profile-name')).toHaveText('Nguyễn Thùy Trâm');
    await expect(page.getByTestId('st-profile-phone')).toHaveValue('+84 90 771 9999');
    await page.getByTestId('st-profile-logout').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('mọi vai trò đều vào được hồ sơ của mình (quyền self)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/profile${S}`);
    await page.evaluate(() => localStorage.setItem('ac_mock_role', 'cs'));
    await page.reload();
    await expect(page.getByTestId('st-profile-form')).toBeVisible();
    await expect(page.getByText('Chăm sóc khách hàng')).toBeVisible();
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('390: hồ sơ không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(`/settings/profile${S}`);
    await expect(page.getByTestId('st-profile-form')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-profile-save'));
  });
});
