// TIP-028 AC3 — E2E chế độ http: Mẫu chứng từ trên backend thật — workspace mới có 4 mẫu mặc định → tải mẫu Word của DN (tệp thật,
// `POST /v1/files` purpose document) → AI nhận diện vị trí (model giả → bộ luật) → bỏ một dòng → bảng kiểm → lưu → Xem trước ra PDF
// (LibreOffice); soạn mẫu rich có biến lạ → báo lỗi; xoá mẫu + hoàn tác.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const DOCX = readFileSync(join(import.meta.dirname, '../../../../packages/core/test/fixtures/documents/hop-dong-spa.docx'));

test.describe('mẫu chứng từ (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('4 mẫu mặc định → tải DOCX → nhận diện → lưu → xem trước PDF; rich biến lạ báo lỗi; xoá + hoàn tác', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'docs');
    await page.goto('/settings/doc_templates');
    await expect(page.locator('[data-doc-tpl]')).toHaveCount(4);

    // Tải mẫu Word.
    await page.getByTestId('doc-upload').click();
    const m = page.getByTestId('doc-docx-modal');
    await m.getByTestId('docx-kind').selectOption('contract');
    await m.getByTestId('docx-file').setInputFiles({ name: 'hop-dong-spa.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: DOCX });
    const map = m.getByTestId('docx-map');
    await expect(map.locator('[data-field="customer.name"]')).toContainText('BÊN B:');
    await expect(map.locator('[data-field="contract.value"]')).toBeVisible();
    await map.locator('[data-field="customer.tax_code"]').getByRole('button', { name: 'Bỏ dòng' }).click();
    await m.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(m.locator('[data-check="dispute"]')).toHaveAttribute('data-ok', '1');
    await m.getByRole('button', { name: 'Xác nhận & lưu' }).click();
    await expect(m).toBeHidden();
    const row = page.locator('[data-doc-tpl][data-kind="contract"]').filter({ hasText: 'hop-dong-spa.docx' });
    await expect(row).toBeVisible();

    // Xem trước: PDF thật.
    await row.getByTestId('st-row-menu').click();
    const popup = context.waitForEvent('page');
    const pdf = page.waitForResponse((r) => /\/doc-templates\/[^/]+\/preview$/.test(r.url()));
    await page.getByRole('menuitem', { name: 'Xem trước' }).click();
    const res = await pdf;
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
    // Trang đọc thân thành blob (Playwright không giữ lại thân) — kiểm kích thước; nội dung PDF kiểm ở integration documents.test.ts.
    expect(Number(res.headers()['content-length'])).toBeGreaterThan(10_000);
    await (await popup).close();

    // Rich: biến lạ báo lỗi.
    await page.getByTestId('doc-new').click();
    const r = page.getByTestId('doc-rich-modal');
    await r.getByTestId('doc-name').fill('Báo giá ngắn');
    await r.getByTestId('doc-body').fill('{{customer.name}} {{contract.value}}');
    await r.getByRole('button', { name: 'Lưu mẫu' }).click();
    await expect(r.getByTestId('doc-err')).toContainText('contract.value');
    await r.getByTestId('doc-body').fill('<p>Kính gửi {{customer.name}}</p><p>Hiệu lực đến {{doc.valid_until}}</p>');
    await r.getByRole('button', { name: 'Lưu mẫu' }).click();
    await expect(r).toBeHidden();
    await expect(page.locator('[data-doc-tpl]')).toHaveCount(6);

    // Xoá mẫu không mặc định + hoàn tác.
    await row.getByTestId('st-row-menu').click();
    await page.getByRole('menuitem', { name: 'Xoá' }).click();
    await expect(page.locator('[data-doc-tpl]')).toHaveCount(5);
    await page.locator('.ant-message-notice').filter({ hasText: 'Xoá mẫu chứng từ' }).first().click();
    await expect(page.locator('[data-doc-tpl]')).toHaveCount(6);
  });
});
