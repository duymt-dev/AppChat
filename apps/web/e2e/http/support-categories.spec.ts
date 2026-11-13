// TIP-034b (http, backend thật) — AC2 / AC5 / AC7: Cài đặt › Danh mục ticket — bản ảo version 0 (8 nhãn) → sửa + đổi chỗ → xác nhận
// (cảnh báo ticket cũ giữ nguyên) → version 1 đọc lại từ server; form ticket mặc định nhãn đầu bộ mới, gõ nhãn tự do vẫn tạo được, bộ lọc
// có nhóm "Đã dùng trong ticket"; Nhập CSV qua TransferPanel dùng chung = MỘT lệnh thay cả bộ (một dòng trùng chặn cả tệp, không có
// "chỉ dòng hợp lệ"); Xuất tải tệp thật chỉ chứa bộ cấu hình. Không gọi LLM ở đường thủ công.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const TAG = Date.now().toString().slice(-6);
const inputs = (page: Page) => page.getByTestId('st-cat-input');
const confirm = (page: Page) => page.getByRole('dialog').getByRole('button', { name: 'Xác nhận', exact: true }).click();

test.describe('danh mục ticket (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('cấu hình → form ticket (mặc định, gợi ý, chữ tự do) → bộ lọc → nhập CSV nguyên khối → xuất', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(180_000);
    await onboarded(page, 'tkcat');
    await page.goto('/settings/ticket_categories');
    await expect(inputs(page)).toHaveCount(8);
    await expect(page.getByTestId('st-ticket-categories')).toHaveAttribute('data-version', '0');

    await inputs(page).nth(2).fill(`Đổi lịch ${TAG}`);
    await inputs(page).nth(2).press('Alt+ArrowUp');
    await inputs(page).nth(1).press('Alt+ArrowUp');
    await expect(inputs(page).first()).toHaveValue(`Đổi lịch ${TAG}`);
    await page.getByTestId('st-cat-save').click();
    await expect(page.getByRole('dialog').locator('[data-warning="existing_tickets_unchanged"]')).toBeVisible();
    await confirm(page);
    await expect(page.getByTestId('st-ticket-categories')).toHaveAttribute('data-version', '1');
    await page.reload();
    await expect(inputs(page).first()).toHaveValue(`Đổi lịch ${TAG}`);

    // Form ticket: mặc định = nhãn đầu bộ cấu hình; nhãn tự do ngoài bộ vẫn tạo được.
    await page.goto('/tickets');
    await page.getByTestId('tk-create').click();
    const f = page.getByTestId('tk-form');
    await expect(f.getByTestId('tk-category')).toHaveValue(`Đổi lịch ${TAG}`);
    await f.getByTestId('tk-title').fill(`Khách hỏi bảo hành ${TAG}`);
    await f.getByTestId('tk-category').fill(`Bảo hành máy ${TAG}`);
    await f.getByTestId('tk-save').click();
    await expect(f).toHaveCount(0);
    await expect(page.getByTestId('tk-drawer')).toContainText(`Bảo hành máy ${TAG}`);
    await page.getByTestId('tk-drawer').press('Escape');
    const filter = page.getByTestId('tk-f-category');
    await expect(filter.locator('optgroup[label="Gợi ý"] option').first()).toHaveText(`Đổi lịch ${TAG}`);
    await expect(filter.locator('optgroup[label="Đã dùng trong ticket"] option', { hasText: `Bảo hành máy ${TAG}` })).toHaveCount(1);

    // Nhập CSV: một dòng trùng chặn cả tệp (không có "chỉ dòng hợp lệ"); tệp sạch → MỘT replace, version 2.
    await page.goto('/settings/ticket_categories');
    await page.getByTestId('st-cat-import').click();
    const dt = page.getByTestId('dt-panel');
    const bad = `Vị trí,Danh mục\r\n1,Giao hàng ${TAG}\r\n2,giao hàng ${TAG}\r\n`;
    await dt.getByTestId('dt-file').setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from(bad) });
    await expect(dt.locator('[data-stat="invalid"] b')).toHaveText('1');
    await expect(dt.getByTestId('dt-atomic-invalid')).toBeVisible();
    await expect(dt.getByTestId('dt-only-valid')).toHaveCount(0);
    await expect(dt.getByTestId('dt-commit')).toBeDisabled();
    // Huỷ kế hoạch lỗi (không ghi gì) → nhập lại tệp sạch.
    await dt.getByTestId('dt-cancel').click();
    await expect(dt).toHaveCount(0);
    await expect(page.getByTestId('st-ticket-categories')).toHaveAttribute('data-version', '1');
    await page.getByTestId('st-cat-import').click();
    const good = `Vị trí,Danh mục\r\n2,Giao hàng ${TAG}\r\n1,Hoàn tiền ${TAG}\r\n`;
    await dt.getByTestId('dt-file').setInputFiles({ name: 'good.csv', mimeType: 'text/csv', buffer: Buffer.from(good) });
    await expect(dt.locator('[data-stat="valid"] b')).toHaveText('2');
    await dt.getByTestId('dt-commit').click();
    await confirm(page);
    await expect(dt.getByTestId('dt-result')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 });
    await dt.getByTestId('dt-done').click();
    await page.reload();
    await expect(page.getByTestId('st-ticket-categories')).toHaveAttribute('data-version', '2');
    await expect(inputs(page)).toHaveCount(2);
    await expect(inputs(page).first()).toHaveValue(`Hoàn tiền ${TAG}`);

    // Xuất: tải tệp XLSX thật (nội dung từng ô + chống công thức kiểm ở integration support-categories-transfer).
    const dl = page.waitForEvent('download');
    await page.getByTestId('st-cat-export').click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/\.xlsx$/);
    const bytes = (await import('node:fs')).readFileSync((await file.path())!);
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');
  });
});
