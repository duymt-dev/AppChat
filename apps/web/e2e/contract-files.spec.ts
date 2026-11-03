// TIP-030b F1 — E2E mock: hợp đồng từ tệp. Form "Tạo hợp đồng": chọn tệp ở ô "File hợp đồng" → kiểm tệp → bảng đề xuất (Dùng từng ô)
// → tạo Nháp nguồn tệp → tab Tệp thấy "Bản gốc". Tệp không an toàn → lý do + Thử lại / quay về mẫu. Tab Tệp của nháp: gắn tệp nguồn.
import { expect, test } from '@playwright/test';
import { pdf } from '../../../fixtures/contracts/files/build-fixtures';
import { isMobile } from './support/mobile';

const URL = '/contracts?session=authed,declared,trialSeen';
const PDF = { name: 'Hop dong dich vu.pdf', mimeType: 'application/pdf', buffer: pdf() };

test.describe('hợp đồng từ tệp (mock)', () => {
  test('tải PDF → đề xuất giá trị → Dùng → tạo Nháp nguồn tệp → tab Tệp có bản gốc', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('ct-create').click();
    const form = page.getByTestId('ct-form');
    await form.getByTestId('ct-source-file').setInputFiles(PDF);
    await expect(form.getByTestId('ct-source-state')).toHaveText('Nguồn ký: Hop dong dich vu.pdf');
    const ex = form.getByTestId('ct-extract');
    await expect(ex.getByTestId('ct-extract-party_b')).toContainText('Nguyễn Văn An');
    await expect(ex.getByTestId('ct-extract-value')).toContainText('Từ tệp');
    // Bên B chỉ để đối chiếu (chọn khách trong danh sách) — không có nút Dùng.
    await expect(ex.getByTestId('ct-extract-party_b').getByRole('button')).toHaveCount(0);
    for (const k of ['value', 'start_date', 'end_date']) await ex.getByTestId(`ct-use-${k}`).click();
    await expect(form.getByTestId('ct-value')).toHaveValue('12500000');
    await expect(form.getByTestId('ct-start_date')).toHaveValue('2026-12-01');
    await expect(form.getByTestId('ct-end_date')).toHaveValue('2027-11-30');
    await form.getByTestId('ct-contact').selectOption('ct_lan');
    await form.getByTestId('ct-save').click();

    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer).toContainText('HĐ-1183');
    await expect(drawer.getByTestId('ct-status')).toHaveText('Nháp');
    await drawer.getByRole('tab', { name: 'Tệp' }).click();
    const file = drawer.getByTestId('ct-files').getByTestId('ct-file').first();
    await expect(file).toContainText('Hop dong dich vu.pdf');
    await expect(file).toContainText('Bản gốc');
    await expect(file.getByTestId('ct-file-open')).toBeVisible();
  });

  test('tệp không an toàn → nêu lý do, chặn lưu; Dùng mẫu theo loại → lưu được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('ct-create').click();
    const form = page.getByTestId('ct-form');
    await form.getByTestId('ct-source-file').setInputFiles({ name: 'macro-hd.docx', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
    await expect(form.getByTestId('ct-source-err')).toContainText('Tệp có macro');
    await expect(form.getByTestId('ct-source-retry')).toBeVisible();
    await form.getByTestId('ct-contact').selectOption('ct_lan');
    await form.getByTestId('ct-value').fill('5.000.000');
    await form.getByTestId('ct-save').click();
    await expect(form.getByTestId('ct-form-err')).toContainText('Tệp hợp đồng chưa kiểm tra xong');
    await form.getByTestId('ct-source-template').click();
    await expect(form.getByTestId('ct-source')).toHaveCount(0);
    await form.getByTestId('ct-save').click();
    await expect(page.getByTestId('ct-drawer')).toContainText('HĐ-1183');
  });

  test('nháp từ mẫu: tab Tệp → Tải tệp lên gắn nguồn ký', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('ct-create').click();
    const form = page.getByTestId('ct-form');
    await form.getByTestId('ct-contact').selectOption('ct_lan');
    await form.getByTestId('ct-value').fill('7.000.000');
    await form.getByTestId('ct-save').click();
    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer.getByTestId('ct-status')).toHaveText('Nháp');
    await drawer.getByRole('tab', { name: 'Tệp' }).click();
    await drawer.getByTestId('ct-file-input').setInputFiles(PDF);
    await expect(drawer.getByTestId('ct-files')).toContainText('Bản gốc');
  });
});

// TIP-030b F2 — AI soạn hai bước (mock): brief → đề xuất (giá danh mục, dòng ngoài danh mục) → tạo nháp → điều khoản gợi ý chặn trình duyệt
// → Giữ / Bỏ → trình duyệt được.
test.describe('AI soạn hợp đồng (mock)', () => {
  test('đề xuất → nháp → gợi ý chặn trình duyệt → Giữ / Bỏ → Chờ duyệt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('ct-create').click();
    const form = page.getByTestId('ct-form');
    const ai = form.getByTestId('ct-ai-draft');
    await expect(ai.getByTestId('ct-ai-prepare')).toBeDisabled();
    await form.getByTestId('ct-contact').selectOption('ct_lan');
    await ai.getByTestId('ct-ai-brief').fill(['- HIFU nâng cơ 8 buổi x1', '- Gói massage đá nóng x2', 'Thời hạn 01/12/2026 đến 30/11/2027', 'ĐIỀU KHOẢN: Bảo lưu gói 30 ngày', 'ĐIỀU KHOẢN: Hoàn tiền bất kỳ lúc nào'].join('\n'));
    await ai.getByTestId('ct-ai-prepare').click();
    const p = ai.getByTestId('ct-ai-proposal');
    await expect(p.getByTestId('ct-ai-line')).toHaveCount(2);
    await expect(p.getByTestId('ct-ai-line').nth(1)).toContainText('ngoài danh mục');
    await expect(p.getByTestId('ct-ai-value')).toContainText('12.800.000');
    await expect(p).toContainText('2 điều khoản AI gợi ý');
    await p.getByTestId('ct-ai-create').click();

    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer.getByTestId('ct-status')).toHaveText('Nháp');
    const sug = drawer.getByTestId('ct-ai-suggestions');
    await expect(sug).toContainText('còn 2 chờ Giữ / Bỏ');
    await expect(drawer.getByTestId('ct-submit')).toBeDisabled();
    await sug.getByTestId('ct-sug-keep-s1').click();
    await sug.getByTestId('ct-sug-discard-s2').click();
    await expect(sug.getByTestId('ct-sug-state-s1')).toHaveText('Đã giữ');
    await expect(sug.getByTestId('ct-sug-state-s2')).toHaveText('Đã bỏ');
    await drawer.getByTestId('ct-submit').click();
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ duyệt');
  });
});
