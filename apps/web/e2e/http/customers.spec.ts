// TIP-015 AC12 — E2E chế độ http (pnpm e2e:http): Khách hàng trên backend thật — trường tuỳ biến ở Cài đặt → tạo khách có giá trị
// → danh sách + tìm không dấu + lọc trường → 360° → kanban đổi giai đoạn (tải lại vẫn giữ) → Cài đặt › Hồ sơ 360° gán mẫu vai trò.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('khách hàng (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('trường tuỳ biến → tạo khách → tìm / lọc → 360° → kanban → bố cục Hồ sơ 360°', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'crm');

    await page.goto('/settings/contacts_fields');
    await expect(page.locator('[data-field="full_name"]')).toBeVisible();
    await page.getByTestId('st-fd-new').click();
    const m = page.getByTestId('st-field-modal');
    await m.getByTestId('st-fm-name').fill('Size áo');
    await m.getByTestId('st-fm-type').selectOption('picklist');
    await m.getByTestId('st-fm-opts').fill('S/M/L');
    await m.getByTestId('st-fm-adv').click();
    await m.getByTestId('st-fm-place-list').click();
    await m.getByTestId('st-fm-place-filter').click();
    await m.getByTestId('st-field-modal-save').click();
    await expect(page.locator('[data-field]').filter({ hasText: 'Size áo' })).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-field]').filter({ hasText: 'Size áo' })).toBeVisible();

    await page.goto('/customers');
    await expect(page.locator('[data-contact]')).toHaveCount(0);
    await page.getByTestId('crm-create').click();
    const form = page.getByTestId('crm-create-modal');
    await form.getByLabel('Họ và tên *').fill('Nguyễn Thị Lan');
    await form.getByLabel('Số điện thoại *').fill('0909 123 456');
    await form.locator('[data-cf] select').last().selectOption('M');
    await page.getByTestId('crm-save').click();
    await expect(form).toHaveCount(0);
    await expect(page.locator('[data-contact]')).toHaveCount(1);

    // Trùng SĐT với khách của chính mình → báo trùng, không tạo thêm.
    await page.getByTestId('crm-create').click();
    await form.getByLabel('Họ và tên *').fill('Lan trùng');
    await form.getByLabel('Số điện thoại *').fill('+84 909 123 456');
    await page.getByTestId('crm-save').click();
    await expect(form).toBeVisible();
    await form.getByRole('button', { name: 'Huỷ' }).click();

    await page.reload();
    await page.getByTestId('crm-search').fill('nguyen thi');
    await expect(page.locator('[data-contact]')).toHaveCount(1);
    await expect(page.locator('[data-contact]').first()).toContainText('Nguyễn Thị Lan');
    await page.getByTestId('crm-search').fill('');
    await page.getByTestId('filter-btn').click();
    await page.getByTestId('filter-pop').getByLabel('Size áo').selectOption('S');
    await page.getByTestId('filter-pop').getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.locator('[data-contact]')).toHaveCount(0);
    await page.reload();

    await page.locator('[data-contact]').first().click();
    await expect(page.getByTestId('crm-360')).toContainText('Nguyễn Thị Lan');
    await page.getByTestId('crm-360').getByRole('button', { name: 'Đóng' }).click();

    await page.getByRole('radio', { name: 'Kanban' }).click();
    await expect(page.getByTestId('crm-kanban').locator('[data-column="lead"] [data-testid="kanban-card"]')).toHaveCount(1);

    await page.goto('/settings/profile_360');
    await expect(page.getByTestId('pl-card-pl_sales')).toBeVisible();
    await page.getByTestId('pl-role-pl_sales-cs').click();
    await page.reload();
    await expect(page.getByTestId('pl-role-pl_sales-cs')).toHaveAttribute('aria-pressed', 'true');
  });
});
