// TIP-026 AC3 — E2E chế độ http: màn Khách hàng nối đủ hành vi trên backend thật — nhập CSV (ghép cột tự động, 1 dòng trùng) → lọc
// thẻ (thẻ tạo ở Cài đặt › Thẻ) → sắp xếp tên → kanban có cột "Thất bại", kéo sang "Đang tư vấn" (tải lại giữ) → Hồ sơ 360° theo bố
// cục vai trò (Owner gán "Kinh doanh" → có tab "Giao dịch") → sửa: chức danh trống không lưu "—", ô Phụ trách không ghi qua contact.update → xuất CSV
// theo bộ lọc. Đồng phụ trách / chuyển phụ trách / xin chia sẻ hai người dùng + thông báo kiểm ở integration (crm-ui.test.ts).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const CSV = '﻿Họ và tên,Số điện thoại,Email\r\nTrần Bảo,0938222110,bao@example.vn\r\nAn Nhiên,0938222111,\r\nTrần Bảo trùng,0938 222 110,\r\n';

test.describe('khách hàng nối đủ (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('nhập CSV → thẻ → sắp xếp → kanban Thất bại → 360° theo vai trò → sửa → xuất', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'crm-ui');

    // Thẻ dùng chung hội thoại + khách (Cài đặt › Thẻ).
    await page.goto('/settings/tags');
    await page.getByTestId('st-tag-new').click();
    await page.getByTestId('st-tag-name').fill('Khách sỉ');
    await page.getByTestId('st-tag-modal-save').click();
    await expect(page.getByTestId('st-tags')).toContainText('Khách sỉ');

    // Nhập: tệp → ghép cột tự động → xem trước → kết quả (2 tạo, 1 trùng trong tệp).
    await page.goto('/customers');
    await page.getByTestId('crm-import-open').click();
    const imp = page.getByTestId('crm-import');
    await imp.getByTestId('import-file').setInputFiles({ name: 'khach.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) });
    await expect(imp.getByTestId('import-preview').locator('tbody tr')).toHaveCount(3);
    await expect(imp.getByLabel('Họ và tên')).toHaveValue('full_name');
    await imp.getByTestId('import-submit').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(imp.getByTestId('import-result').locator('[data-stat="created"] b')).toHaveText('2');
    await expect(imp.getByTestId('import-result').locator('[data-stat="duplicates"] b')).toHaveText('1');
    await imp.getByRole('button', { name: 'Xong' }).click();
    await expect(page.locator('[data-contact]')).toHaveCount(2);

    // Sắp xếp tên A → Z.
    await page.getByTestId('crm-sort').click();
    await page.getByTestId('crm-sort-name').click();
    await expect(page.locator('[data-contact]').first()).toContainText('An Nhiên');

    // Kanban: gắn thẻ → lọc thẻ; "Thất bại" chỉ hiện khi có khách; kéo sang Đang tư vấn.
    await page.getByRole('radio', { name: 'Kanban' }).click();
    const board = page.getByTestId('crm-kanban');
    await expect(board.locator('[data-column="lead"] [data-testid="kanban-card"]')).toHaveCount(2);
    await expect(board.locator('[data-column="lost"]')).toHaveCount(0);
    const bao = board.locator('[data-testid="kanban-card"]').filter({ hasText: 'Trần Bảo' });
    await bao.getByRole('button', { name: 'Tag' }).click();
    await page.getByTestId('tag-pop').getByRole('button', { name: 'Khách sỉ' }).click();
    await expect(bao).toContainText('Khách sỉ');
    // Lớp phủ của popover thẻ phủ cả màn — bấm ra ngoài để đóng.
    await page.mouse.click(4, 4);
    await expect(page.getByTestId('tag-pop')).toHaveCount(0);
    await page.getByTestId('filter-btn').click();
    await page.getByTestId('filter-pop').getByLabel('Tags').selectOption({ label: 'Khách sỉ' });
    await page.getByTestId('filter-pop').getByRole('button', { name: 'Áp dụng' }).click();
    await expect(board.locator('[data-testid="kanban-card"]')).toHaveCount(1);
    await bao.dragTo(board.locator('[data-column="consulting"]'));
    await expect(board.locator('[data-column="consulting"]')).toContainText('Trần Bảo');
    await page.reload();
    await page.getByRole('radio', { name: 'Kanban' }).click();
    await expect(page.getByTestId('crm-kanban').locator('[data-column="consulting"]')).toContainText('Trần Bảo');

    // Hồ sơ 360° theo bố cục vai trò: Owner gán "Kinh doanh" → tab "Giao dịch" (khối báo giá / đơn / lịch hẹn), không có tab "Tệp".
    await page.goto('/settings/profile_360');
    await page.getByTestId('pl-role-pl_sales-owner').click();
    await expect(page.getByTestId('pl-role-pl_sales-owner')).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/customers');
    await page.locator('[data-contact]').filter({ hasText: 'An Nhiên' }).click();
    const p360 = page.getByTestId('crm-360');
    await expect(p360.getByRole('tab', { name: 'Giao dịch' })).toBeVisible();
    await expect(p360.getByRole('tab', { name: 'Tệp' })).toHaveCount(0);
    await p360.getByRole('tab', { name: 'Giao dịch' }).click();
    await expect(p360.locator('[data-block="quotes"]')).toBeVisible();
    await p360.getByRole('button', { name: 'Đóng' }).click();

    // Sửa: chức danh trống không thành "—"; ô Phụ trách giữ người hiện tại (đổi = mở Chuyển phụ trách — workspace E2E chỉ có Owner).
    const row = page.locator('[data-contact]').filter({ hasText: 'An Nhiên' });
    await row.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByTestId('crm-row-menu').getByRole('menuitem', { name: 'Cập nhật khách hàng' }).click();
    const edit = page.getByTestId('crm-edit');
    await expect(edit.getByLabel('Phụ trách')).toBeEnabled();
    await expect(edit.getByLabel('Chức danh')).toHaveValue('');
    await edit.getByLabel('Khu vực').fill('Đà Nẵng');
    await page.getByTestId('crm-save').click();
    await expect(edit).toHaveCount(0);
    await page.reload();
    await row.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByTestId('crm-row-menu').getByRole('menuitem', { name: 'Cập nhật khách hàng' }).click();
    await expect(page.getByTestId('crm-edit').getByLabel('Chức danh')).toHaveValue('');
    await expect(page.getByTestId('crm-edit').getByLabel('Khu vực')).toHaveValue('Đà Nẵng');
    await page.getByTestId('crm-edit').getByRole('button', { name: 'Huỷ' }).click();

    // Xuất theo bộ lọc thẻ: chỉ Trần Bảo.
    await page.getByTestId('filter-btn').click();
    await page.getByTestId('filter-pop').getByLabel('Tags').selectOption({ label: 'Khách sỉ' });
    await page.getByTestId('filter-pop').getByRole('button', { name: 'Áp dụng' }).click();
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByTestId('crm-export').click()]);
    const csv = await (await download.createReadStream()).toArray();
    const text = Buffer.concat(csv as Buffer[]).toString('utf8');
    expect(text).toContain('Trần Bảo');
    expect(text).not.toContain('An Nhiên');
  });
});
