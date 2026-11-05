// TIP-045b — bằng chứng UI (mock, cùng luật server): thu hồi quyền xem trường → giá trị biến khỏi bảng / 360° với vai trò ngoài danh sách
// (không thay bằng ô rỗng giả — cột không còn); đổi Chủ sở hữu: mã OTP + gõ lại tên, sai mã báo lỗi không đổi gì, đúng mã → người nhận là
// Chủ sở hữu, mình thành Quản lý (nút chuyển biến mất). Mock giữ dữ liệu trong bộ nhớ: chuyển màn bằng rail, không reload.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const MOCK_TRANSFER_OTP = '246810';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

test.describe('hardening (TIP-045b)', () => {
  test('thu hồi quyền xem trường: Quản lý vẫn thấy, Sales không còn cột / giá trị ở bảng và 360°', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/contacts_fields${S}`);
    await page.getByTestId('st-fd-tab-contact').click();
    await page.locator('[data-field="tier"]').getByTestId('st-row-menu').click();
    await page.getByRole('menuitem', { name: 'Chỉnh sửa' }).click();
    const m = page.getByTestId('st-field-modal');
    await m.getByTestId('st-fm-adv').click();
    await m.getByTestId('st-fm-role-manager').click();
    await expect(m.getByTestId('st-fm-role-manager')).toHaveAttribute('aria-pressed', 'true');
    await m.getByTestId('st-field-modal-save').click();
    await expect(m).toHaveCount(0);

    await setRole(page, 'Quản lý');
    await page.locator('[data-nav="customers"]').click();
    const table = page.getByTestId('crm-table');
    await expect(table.locator('[data-contact="ct_lan"] [data-cf="tier"]')).toHaveText('VIP');

    await setRole(page, 'Sales');
    await expect(table.getByRole('columnheader', { name: 'Tier khách' })).toHaveCount(0);
    await expect(table.locator('[data-cf="tier"]')).toHaveCount(0);
    await page.locator('[data-contact="ct_lan"]').first().click();
    await expect(page.getByTestId('crm-360')).toBeVisible();
    await expect(page.getByTestId('crm-360').locator('[data-cf="tier"]')).toHaveCount(0);
    // "VIP" vẫn có thể là nhóm khách (trường hệ thống) — chỉ trường tuỳ biến "Tier khách" phải biến mất khỏi khối Thông tin thêm.
    await expect(page.getByTestId('crm-360').getByTestId('cf-detail')).not.toContainText('Tier khách');
  });

  test('đổi Chủ sở hữu: sai mã → lỗi, không đổi; đúng mã + gõ lại tên → người nhận là Chủ sở hữu, mình thành Quản lý', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/members${S}`);
    await page.getByTestId('st-transfer').click();
    const modal = page.getByTestId('st-transfer-modal');
    await modal.getByTestId('st-transfer-to').selectOption('u_tram');
    await expect(modal.getByTestId('st-transfer-consequence')).toContainText('Nguyễn Thùy Trâm sẽ là Chủ sở hữu duy nhất');
    await modal.getByRole('button', { name: 'Gửi mã xác nhận' }).click();
    await expect(modal).toContainText('Đã gửi mã 6 số');

    await modal.getByTestId('st-transfer-otp').fill('111111');
    await modal.getByTestId('st-transfer-name').fill('Nguyễn Thùy Trâm');
    await modal.getByRole('button', { name: 'Chuyển quyền' }).click();
    await expect(modal.getByTestId('st-transfer-error')).toHaveText('Mã không đúng');
    await expect(page.locator('[data-member="u_ngoc"]').getByTestId('st-member-role')).toHaveText('Chủ sở hữu');

    await modal.getByTestId('st-transfer-otp').fill(MOCK_TRANSFER_OTP);
    await modal.getByRole('button', { name: 'Chuyển quyền' }).click();
    await expect(modal).toHaveCount(0);
    await expect(page.locator('[data-member="u_tram"]').getByTestId('st-member-role')).toHaveText('Chủ sở hữu');
    await expect(page.locator('[data-member="u_ngoc"]').getByTestId('st-member-role')).toHaveText('Quản lý');
    await expect(page.getByTestId('st-transfer')).toHaveCount(0);
  });
});
