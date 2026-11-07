// TIP-038b P4 (mock): TransferPanel nhập dữ liệu dùng chung — mở từ modal Nhập khách hàng → tải CSV → ánh xạ đoán + thẻ đếm + xem trước
// theo kết quả kiểm → sửa ánh xạ (version mới) → "Chỉ nhập dòng hợp lệ" → tải tệp lỗi (CSV thật, chặn công thức) → Nhập (xác nhận bulk)
// → kết quả thật; mobile 390 không tràn ngang, nút ≥ 44px. Chip tệp CSV đính kèm Trợ lý có gợi ý "Nhập dữ liệu từ tệp này".
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const TAG = Date.now().toString().slice(-6);
const CSV = `Tên khách,Điện thoại,Ghi chú\nAn ${TAG},0987${TAG},\nBình ${TAG},abc,=1+1\nChi ${TAG},0987${TAG},trùng\n`;

async function openPanel(page: Page) {
  await page.goto(`/customers${S}`);
  await page.getByTestId('crm-import-open').click();
  await page.getByTestId('crm-import').getByTestId('import-advanced').click();
  return page.getByTestId('dt-panel');
}

test.describe('nhập dữ liệu dùng chung', () => {
  test('tệp → ánh xạ → sửa → chỉ dòng hợp lệ → tệp lỗi → nhập → kết quả', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop (mobile riêng dưới)');
    const dt = await openPanel(page);
    await expect(dt.locator('[data-entity="contact"]')).toHaveAttribute('aria-checked', 'true');
    await dt.getByTestId('dt-file').setInputFiles({ name: 'khach.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) });
    await expect(dt.getByTestId('dt-file-name')).toHaveText('khach.csv');
    await expect(dt.locator('[data-field="full_name"]')).toHaveValue('Tên khách');
    await expect(dt.locator('[data-field="phone"]')).toHaveValue('Điện thoại');
    await expect(dt.locator('[data-stat="valid"] b')).toHaveText('1');
    await expect(dt.locator('[data-stat="invalid"] b')).toHaveText('1');
    await expect(dt.locator('[data-stat="duplicates"] b')).toHaveText('1');
    await expect(dt.getByTestId('dt-commit')).toBeDisabled();

    // Bỏ ghép SĐT → mọi dòng thiếu liên hệ (version mới, kiểm lại) → ghép lại.
    await dt.locator('[data-field="phone"]').selectOption('');
    await expect(dt.locator('[data-stat="invalid"] b')).toHaveText('3');
    await dt.locator('[data-field="phone"]').selectOption('Điện thoại');
    await expect(dt.locator('[data-stat="valid"] b')).toHaveText('1');

    await dt.getByRole('tab', { name: 'Lỗi' }).click();
    await expect(dt.getByTestId('dt-preview').locator('tbody tr')).toHaveCount(1);
    await expect(dt.getByTestId('dt-preview').locator('tbody tr')).toContainText('Số điện thoại: Không hợp lệ');

    const dl = page.waitForEvent('download');
    await dt.getByTestId('dt-errors').click();
    const file = await (await dl).createReadStream();
    const text = await new Promise<string>((ok) => {
      let b = '';
      file.on('data', (c) => (b += c));
      file.on('end', () => ok(b));
    });
    expect(text).toContain('Dòng,Cột trong tệp,Mã lỗi,Mô tả,Giá trị đã đọc');
    expect(text).toContain('2,Điện thoại,invalid,Không hợp lệ,');

    await dt.getByTestId('dt-only-valid').click();
    await expect(dt.getByTestId('dt-only-valid')).toBeChecked();
    await expect(dt.getByTestId('dt-commit')).toBeEnabled();
    await dt.getByTestId('dt-commit').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(dt.getByTestId('dt-result')).toHaveAttribute('data-status', 'completed');
    await expect(dt.locator('[data-stat="applied"] b')).toHaveText('1');
    await expect(dt.locator('[data-stat="skipped"] b')).toHaveText('2');
    await dt.getByTestId('dt-done').click();
    await expect(page.locator('[data-contact]').filter({ hasText: `An ${TAG}` })).toHaveCount(1);
  });

  test('Trợ lý: chip CSV đính kèm có gợi ý nhập → điền câu lệnh', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant${S}`);
    await page.getByTestId('asst-attach-input').setInputFiles({ name: 'khach.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) });
    await page.getByTestId('asst-attachment-hint').click();
    await expect(page.getByTestId('asst-composer').locator('textarea')).toHaveValue('Nhập dữ liệu từ tệp này');
  });

  test('mobile 390: panel toàn màn, không tràn ngang, nút đủ lớn', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    // Nút "Nhập" ẩn < md — mở bằng liên kết sâu `?transfer=<thực thể>` (cùng host với lệnh Trợ lý).
    await page.goto(`/customers${S}&transfer=product`);
    const dt = page.getByTestId('dt-panel');
    await expect(dt).toBeVisible();
    await expect(dt.locator('[data-entity="product"]')).toHaveAttribute('aria-checked', 'true');
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(dt.locator('[data-entity]'));
    await expectTouchTargets(dt.getByTestId('dt-pick'));
  });
});
