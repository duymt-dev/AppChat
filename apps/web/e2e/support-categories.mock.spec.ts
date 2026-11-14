// TIP-034b §3 (mock): Cài đặt › Danh mục ticket — mục cuối nav (không đẩy lệch mục prototype), sửa / đổi chỗ bằng bàn phím / xoá, tóm
// tắt thay đổi, xác nhận (cảnh báo ticket cũ giữ nguyên) → lưu; form ticket: combobox chữ tự do — mặc định là nhãn đầu của bộ mới, nhóm
// "Gợi ý" + "Đã dùng trong ticket", gõ nhãn tự do vẫn tạo được; bộ lọc có nhãn mới. Nhân viên CS (không settings.manage) → không có quyền.
// Mobile 390: không tràn ngang.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const push = (page: Page, path: string) => page.evaluate((p) => (window as unknown as { next: { router: { push: (u: string) => void } } }).next.router.push(p), path);
const inputs = (page: Page) => page.getByTestId('st-cat-input');

test.describe('danh mục ticket (TIP-034b, mock)', () => {
  test('cấu hình bộ gợi ý → form ticket mặc định nhãn đầu, chọn gợi ý / gõ tự do → bộ lọc có nhãn mới', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/ticket_categories${S}`);
    // Mục mới ở cuối nhóm cuối nav — ngay sau "Lịch hẹn".
    const nav = page.getByTestId('st-nav-ticket_categories');
    await expect(nav).toBeVisible();
    const keys = await page.locator('[data-testid^="st-nav-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    expect(keys.slice(-2)).toEqual(['st-nav-booking', 'st-nav-ticket_categories']);
    await expect(page.getByTestId('st-title')).toHaveText('Danh mục ticket');
    await expect(inputs(page)).toHaveCount(8);
    await expect(inputs(page).first()).toHaveValue('Refund');

    await inputs(page).nth(1).fill('Hoàn tiền');
    await inputs(page).nth(1).press('Alt+ArrowUp');
    await expect(inputs(page).first()).toHaveValue('Hoàn tiền');
    await expect(inputs(page).first()).toBeFocused();
    await page.getByTestId('st-cat-add').click();
    await inputs(page).last().fill('refund');
    await expect(page.getByTestId('st-cat-error')).toHaveText('Trùng với danh mục phía trên (không phân biệt hoa thường)');
    await expect(page.getByTestId('st-cat-save')).toBeDisabled();
    await inputs(page).last().fill('Bảo hành');
    const diff = page.getByTestId('st-cat-diff');
    await expect(diff).toContainText('Thêm: Hoàn tiền, Bảo hành');
    await expect(diff).toContainText('Bỏ khỏi gợi ý: Delivery');
    await expect(diff).toContainText('Mặc định mới: Hoàn tiền');

    await page.getByTestId('st-cat-save').click();
    const dlg = page.getByRole('dialog');
    await expect(dlg.locator('[data-warning="existing_tickets_unchanged"]')).toHaveText('Ticket cũ giữ nguyên danh mục — chỉ bộ gợi ý thay đổi.');
    await dlg.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(page.getByTestId('st-ticket-categories')).toHaveAttribute('data-version', '1');
    await expect(page.getByTestId('st-cat-diff')).toHaveCount(0);

    await push(page, `/tickets${S}`);
    await page.getByTestId('tk-create').click();
    const f = page.getByTestId('tk-form');
    const cat = f.getByTestId('tk-category');
    await expect(cat).toHaveValue('Hoàn tiền');
    await cat.fill('');
    await cat.focus();
    const pop = page.getByTestId('tk-category-pop');
    await expect(pop.getByTestId('tk-category-opt-suggested').first()).toHaveText('Hoàn tiền');
    await expect(pop.getByTestId('tk-category-opt-suggested').last()).toHaveText('Bảo hành');
    await cat.fill('bảo');
    await cat.press('ArrowDown');
    await cat.press('Enter');
    await expect(cat).toHaveValue('Bảo hành');
    // Nhãn tự do ngoài bộ gợi ý vẫn được nhận.
    await cat.fill('Đổi lịch hẹn');
    await expect(pop).toContainText('Dùng "Đổi lịch hẹn" làm danh mục mới');
    await f.getByTestId('tk-title').fill('Khách xin dời lịch liệu trình');
    await f.getByTestId('tk-save').click();
    await expect(page.getByTestId('tk-drawer')).toContainText('Đổi lịch hẹn');
    await page.getByTestId('tk-drawer').press('Escape');

    const filter = page.getByTestId('tk-f-category');
    await expect(filter.locator('optgroup[label="Gợi ý"] option').first()).toHaveText('Hoàn tiền');
    await expect(filter.locator('optgroup[label="Đã dùng trong ticket"] option', { hasText: 'Đổi lịch hẹn' })).toHaveCount(1);
    await filter.selectOption('Đổi lịch hẹn');
    await expect(page.locator('[data-ticket]')).toHaveCount(1);
  });

  test('CS không có settings.manage → mục báo không có quyền; form ticket vẫn có gợi ý', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/ticket_categories${S}`);
    await page.evaluate(() => localStorage.setItem('ac_mock_role', 'cs'));
    await page.reload();
    await expect(page.getByText('Bạn không có quyền xem mục này')).toBeVisible();
    await expect(page.getByTestId('st-ticket-categories')).toHaveCount(0);
    await push(page, `/tickets${S}`);
    await page.getByTestId('tk-create').click();
    await expect(page.getByTestId('tk-category')).toHaveValue('Refund');
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('390: mục Danh mục ticket không tràn ngang, nút chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(`/settings/ticket_categories${S}`);
    await expect(inputs(page)).toHaveCount(8);
    await expectNoHorizontalOverflow(page);
    const box = await page.getByTestId('st-cat-up').first().boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
