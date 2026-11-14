import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const go = `/settings/doc_templates${S}`;

test.describe('settings · Mẫu chứng từ (D30)', () => {
  test('danh sách theo loại, mặc định không xoá được, đổi mặc định, xoá + hoàn tác', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go);
    await expect(page.locator('[data-doc-tpl]')).toHaveCount(5);
    await page.getByTestId('doc-kind-quote').click();
    await expect(page.locator('[data-doc-tpl]')).toHaveCount(2);
    await page.getByTestId('doc-set-default-tpl_q2').click();
    await expect(page.locator('[data-doc-tpl="tpl_q2"]').getByTestId('doc-default-quote')).toBeVisible();
    await page.locator('[data-doc-tpl="tpl_q2"]').getByTestId('st-row-menu').click();
    await expect(page.getByRole('menuitem', { name: 'Xoá' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.goto(go);
    await page.locator('[data-doc-tpl="tpl_q2"]').getByTestId('st-row-menu').click();
    await page.getByText('Xoá', { exact: true }).click();
    await expect(page.locator('[data-doc-tpl]')).toHaveCount(4);
  });

  test('mẫu soạn trong app: chèn biến, biến lạ báo lỗi, phiếu thu khoá dòng không thay thế HĐ GTGT, bảng kiểm báo giá', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go);
    await page.getByTestId('doc-new').click();
    const m = page.getByTestId('doc-rich-modal');
    await m.getByTestId('doc-name').fill('Báo giá ngắn');
    await m.getByRole('button', { name: 'customer.name' }).click();
    await expect(m.getByTestId('doc-body')).toHaveValue('{{customer.name}}');
    await expect(m.locator('[data-check="validity"]')).toHaveAttribute('data-ok', '0');
    await m.getByRole('button', { name: 'doc.valid_until' }).click();
    await expect(m.locator('[data-check="validity"]')).toHaveAttribute('data-ok', '1');
    await m.getByTestId('doc-body').fill('{{customer.name}} {{contract.value}}');
    await m.getByRole('button', { name: 'Lưu mẫu' }).click();
    await expect(m.getByTestId('doc-err')).toContainText('contract.value');
    await m.getByTestId('doc-kind-select').selectOption('receipt');
    await expect(m.getByTestId('doc-not-vat')).toBeVisible();
    await m.getByTestId('doc-body').fill('<p>Đã nhận của {{customer.name}}: {{totals.total}}</p>');
    await m.getByRole('button', { name: 'Lưu mẫu' }).click();
    await expect(m).toBeHidden();
    await expect(page.locator('[data-doc-tpl]')).toHaveCount(6);
  });

  test('wizard DOCX: từ chối .docm, AI nhận diện biến, sửa / bỏ dòng, bảng kiểm hợp đồng, lưu chỉ ở bước xác nhận', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go);
    await page.getByTestId('doc-upload').click();
    const m = page.getByTestId('doc-docx-modal');
    await m.getByTestId('docx-file').setInputFiles({ name: 'mau.docm', mimeType: 'application/vnd.ms-word', buffer: Buffer.from('x') });
    await expect(m.getByTestId('doc-err')).toContainText('.docx');
    await m.getByTestId('docx-file').setInputFiles({ name: 'hop-dong-spa.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('x') });
    await expect(m.getByTestId('docx-map').locator('[data-field]')).toHaveCount(5);
    await expect(m.getByTestId('docx-name')).toHaveValue('hop-dong-spa');
    await expect(m.getByRole('button', { name: 'Xác nhận & lưu' })).toHaveCount(0);
    const row = m.locator('[data-field="contract.start"]');
    await row.getByRole('combobox').selectOption('contract.end');
    await m.locator('[data-field="customer.tax_code"]').getByRole('button', { name: 'Bỏ dòng' }).click();
    await expect(m.getByTestId('docx-map').locator('[data-field]')).toHaveCount(4);
    await m.getByRole('button', { name: 'Tiếp tục' }).click();
    await expect(m.getByTestId('doc-checklist').locator('[data-check]')).toHaveCount(9);
    await expect(m.locator('[data-check="dispute"]')).toHaveAttribute('data-ok', '0');
    await m.getByRole('button', { name: 'Xác nhận & lưu' }).click();
    await expect(m).toBeHidden();
    await expect(page.locator('[data-doc-tpl][data-kind="contract"]')).toHaveCount(2);
  });

  test('TIP-028: cảnh báo bảng kiểm còn thiếu trên dòng; Xem trước mở bản điền dữ liệu minh hoạ', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go);
    await expect(page.locator('[data-doc-tpl="tpl_q1"]').getByTestId('doc-missing-tpl_q1')).toContainText('3 mục');
    await expect(page.getByTestId('doc-missing-tpl_r1')).toHaveCount(0);
    await page.locator('[data-doc-tpl="tpl_r1"]').getByTestId('st-row-menu').click();
    const popup = context.waitForEvent('page');
    await page.getByRole('menuitem', { name: 'Xem trước' }).click();
    const tab = await popup;
    await expect(tab.locator('body')).toContainText('không thay thế hoá đơn giá trị gia tăng');
    await expect(tab.locator('body')).toContainText('Công ty TNHH Khách Hàng Mẫu');
  });

  test('quyền: Nhân viên kinh doanh không vào được Mẫu chứng từ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go);
    await page.evaluate(() => localStorage.setItem('ac_mock_role', 'sales'));
    await page.reload();
    await expect(page.getByText('Bạn không có quyền xem mục này')).toBeVisible();
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('390: danh sách + hộp soạn + wizard — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(go);
    await expect(page.locator('[data-doc-tpl]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('doc-kind-quote'));
    await page.getByTestId('doc-new').click();
    await expect(page.getByTestId('doc-rich-modal')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go);
    await page.getByTestId('doc-upload').click();
    await page.getByTestId('docx-file').setInputFiles({ name: 'bao-gia.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('x') });
    await expect(page.getByTestId('docx-map')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
