// TIP-038b P4 (http, backend thật): TransferPanel dùng chung — tải CSV (purpose import) → transfer.plan (server đoán ánh xạ, kiểm
// SĐT / trùng trong tệp) → bỏ / ghép lại SĐT (update_mapping, version mới) → tệp lỗi tải từ `/data-transfer/plans/:id/rows?check=invalid`
// → "Chỉ nhập dòng hợp lệ" → transfer.commit (bulk, xác nhận có số dòng) → khách tạo qua contact.import, kết quả thật từ receipts.
// Sản phẩm qua product.import (cùng panel). Không gọi LLM ở đường thủ công (AC05). Mobile 390: liên kết sâu `?transfer=`.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const TAG = Date.now().toString().slice(-6);
const CSV = `﻿Tên khách,Điện thoại,Ghi chú\r\nAn ${TAG},0987${TAG},\r\nBình ${TAG},abc,=1+1\r\nChi ${TAG},0987 ${TAG},trùng\r\n`;
const PRODUCTS = `Tên sản phẩm,Giá bán,Mã SKU\r\nSerum ${TAG},350.000,DT-${TAG}\r\n`;

test.describe('nhập dữ liệu dùng chung (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('khách: kế hoạch → sửa ánh xạ → tệp lỗi → chỉ dòng hợp lệ → nhập; sản phẩm qua cùng panel', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'dt');
    await page.goto('/customers?transfer=contact');
    const dt = page.getByTestId('dt-panel');
    await dt.getByTestId('dt-file').setInputFiles({ name: 'khach.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) });
    await expect(dt.locator('[data-field="full_name"]')).toHaveValue('Tên khách');
    await expect(dt.locator('[data-field="phone"]')).toHaveValue('Điện thoại');
    await expect(dt.locator('[data-stat="valid"] b')).toHaveText('1');
    await expect(dt.locator('[data-stat="invalid"] b')).toHaveText('1');
    await expect(dt.locator('[data-stat="duplicates"] b')).toHaveText('1');
    await expect(dt.getByTestId('dt-commit')).toBeDisabled();

    await dt.locator('[data-field="phone"]').selectOption('');
    await expect(dt.locator('[data-stat="valid"] b')).toHaveText('0');
    await dt.locator('[data-field="phone"]').selectOption('Điện thoại');
    await expect(dt.locator('[data-stat="valid"] b')).toHaveText('1');

    const dl = page.waitForEvent('download');
    await dt.getByTestId('dt-errors').click();
    const path = await (await dl).path();
    const text = (await import('node:fs')).readFileSync(path, 'utf8');
    expect(text.startsWith('﻿Dòng,Cột trong tệp')).toBe(true);
    expect(text).toContain('2,Điện thoại,invalid,Không hợp lệ');
    expect(text).not.toContain(`0987${TAG}`);

    await dt.getByTestId('dt-only-valid').click();
    await expect(dt.getByTestId('dt-only-valid')).toBeChecked();
    await dt.getByTestId('dt-commit').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dt.getByTestId('dt-result')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 });
    await expect(dt.locator('[data-stat="applied"] b')).toHaveText('1');
    await dt.getByTestId('dt-done').click();
    await expect(page.locator('[data-contact]').filter({ hasText: `An ${TAG}` })).toHaveCount(1);
    await expect(page.locator('[data-contact]').filter({ hasText: `Bình ${TAG}` })).toHaveCount(0);

    await page.goto('/products?transfer=product');
    await dt.getByTestId('dt-file').setInputFiles({ name: 'sp.csv', mimeType: 'text/csv', buffer: Buffer.from(PRODUCTS) });
    await expect(dt.locator('[data-stat="valid"] b')).toHaveText('1');
    await dt.getByTestId('dt-commit').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dt.getByTestId('dt-result')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 });
    await expect(dt.locator('[data-stat="applied"] b')).toHaveText('1');
    await dt.getByTestId('dt-done').click();
    await expect(page.getByText(`Serum ${TAG}`).first()).toBeVisible();
  });

  test('tập ghi chú khách (TIP-026b): chọn tập → kế hoạch giữ tập → khách theo SĐT → nhập → ghi chú thật trên khách', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'dtn');
    await page.goto('/customers?transfer=contact');
    const dt = page.getByTestId('dt-panel');
    await dt.getByTestId('dt-file').setInputFiles({ name: 'k.csv', mimeType: 'text/csv', buffer: Buffer.from(`Tên khách,Điện thoại\r\nNote ${TAG},0986${TAG}\r\n`) });
    await dt.getByTestId('dt-commit').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dt.getByTestId('dt-result')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 });
    await dt.getByTestId('dt-done').click();

    await page.goto('/customers?transfer=contact');
    await dt.locator('[data-dataset="contact_notes"]').click();
    // Dòng 2: loại "Hoàn thành" không phải ghi chú / bình luận → lỗi option (không đoán).
    const notes = `SĐT,Loại,Nội dung\r\n0986${TAG},Ghi chú,Hẹn tái khám ${TAG}\r\n0986${TAG},Hoàn thành,Sai loại ${TAG}\r\n`;
    await dt.getByTestId('dt-file').setInputFiles({ name: 'ghi-chu.csv', mimeType: 'text/csv', buffer: Buffer.from(notes) });
    await expect(dt.getByTestId('dt-plan-dataset')).toContainText('Ghi chú');
    await expect(dt.locator('[data-stat="valid"] b')).toHaveText('1');
    await expect(dt.locator('[data-stat="invalid"] b')).toHaveText('1');
    await dt.getByTestId('dt-only-valid').click();
    await dt.getByTestId('dt-commit').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dt.getByTestId('dt-result')).toHaveAttribute('data-status', 'completed', { timeout: 30_000 });
    await expect(dt.locator('[data-stat="applied"] b')).toHaveText('1');
    await dt.getByTestId('dt-done').click();
    // Hồ sơ 360° đọc ghi chú thật từ server (tác giả = người nhập).
    await page.locator('[data-contact]').filter({ hasText: `Note ${TAG}` }).first().click();
    await expect(page.getByText(`Hẹn tái khám ${TAG}`).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Sai loại ${TAG}`)).toHaveCount(0);
  });

  test('mobile 390: mở bằng liên kết sâu, không tràn ngang, nút đủ lớn', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await onboarded(page, 'dtm');
    await page.goto('/customers?transfer=contact');
    const dt = page.getByTestId('dt-panel');
    await expect(dt).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(dt.locator('[data-entity]'));
    await expectTouchTargets(dt.getByTestId('dt-pick'));
  });
});
