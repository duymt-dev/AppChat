// TIP-045b — E2E chế độ http (pnpm e2e:http hardening): quyền theo TRƯỜNG phía server trên backend thật. Owner tạo trường "Hạn mức nội bộ"
// (cột + chi tiết), nhập giá trị canary cho khách → thấy ở bảng / 360°; thu hồi (vai trò được xem = chỉ Quản lý — Owner không trong danh
// sách tường minh, custom-fields §24) → tải lại: cột, ô và giá trị biến mất khỏi bảng, 360° và kết quả tìm kiếm (server bỏ key khỏi
// response — không phải FE ẩn). Mở lại cho mọi vai trò → giá trị cũ hiện lại (thu hồi không xoá dữ liệu).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const LABEL = 'Hạn mức nội bộ';
const CANARY = 'HM-CANARY-4521';

test.describe('hardening (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('thu hồi quyền xem trường → server bỏ giá trị khỏi bảng / 360° / tìm kiếm; mở lại → dữ liệu còn nguyên', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'hard');

    await page.goto('/settings/contacts_fields');
    await page.getByTestId('st-fd-tab-contact').click();
    await page.getByTestId('st-fd-new').click();
    const m = page.getByTestId('st-field-modal');
    await m.getByTestId('st-fm-name').fill(LABEL);
    await m.getByTestId('st-fm-type').selectOption('text');
    await m.getByTestId('st-fm-adv').click();
    await m.getByTestId('st-fm-place-list').click();
    await m.getByTestId('st-field-modal-save').click();
    const row = page.locator('[data-field]').filter({ hasText: LABEL });
    await expect(row).toBeVisible();
    const key = (await row.getAttribute('data-field'))!;

    await page.goto('/customers');
    await page.getByTestId('crm-create').click();
    const form = page.getByTestId('crm-create-modal');
    await form.getByLabel('Họ và tên *').fill('Khách Thu Hồi');
    await form.getByLabel('Số điện thoại *').fill('0909 777 111');
    await form.getByTestId(`cf-in-${key}`).fill(CANARY);
    await page.getByTestId('crm-save').click();
    await expect(form).toHaveCount(0);
    const table = page.getByTestId('crm-table');
    await expect(table.locator(`[data-cf="${key}"]`).first()).toHaveText(CANARY);

    // Thu hồi: chỉ Quản lý được xem.
    await page.goto('/settings/contacts_fields');
    await page.locator(`[data-field="${key}"]`).getByTestId('st-row-menu').click();
    await page.getByRole('menuitem', { name: 'Chỉnh sửa' }).click();
    await m.getByTestId('st-fm-adv').click();
    await m.getByTestId('st-fm-role-manager').click();
    await m.getByTestId('st-field-modal-save').click();
    await expect(m).toHaveCount(0);
    await expect(page.locator(`[data-field="${key}"]`)).toContainText('Quản lý');

    await page.goto('/customers');
    await expect(page.locator('[data-contact]')).toHaveCount(1);
    await expect(table.getByRole('columnheader', { name: LABEL })).toHaveCount(0);
    await expect(table).not.toContainText(CANARY);
    await page.locator('[data-contact]').first().click();
    await expect(page.getByTestId('crm-360')).toContainText('Khách Thu Hồi');
    await expect(page.getByTestId('crm-360')).not.toContainText(CANARY);
    await expect(page.getByTestId('crm-360')).not.toContainText(LABEL);
    // Tìm theo giá trị bị ẩn không được thành kênh suy ra (không khớp qua tìm kiếm chung).
    await page.goto('/customers');
    await page.getByTestId('crm-search').fill(CANARY);
    await expect(page.locator('[data-contact]')).toHaveCount(0);

    // Mở lại cho mọi vai trò → giá trị còn nguyên (thu hồi không xoá dữ liệu).
    await page.goto('/settings/contacts_fields');
    await page.locator(`[data-field="${key}"]`).getByTestId('st-row-menu').click();
    await page.getByRole('menuitem', { name: 'Chỉnh sửa' }).click();
    await m.getByTestId('st-fm-adv').click();
    await m.getByTestId('st-fm-role-manager').click();
    await m.getByTestId('st-field-modal-save').click();
    await expect(m).toHaveCount(0);
    await page.goto('/customers');
    await expect(page.getByTestId('crm-table').locator(`[data-cf="${key}"]`).first()).toHaveText(CANARY);
  });
});
