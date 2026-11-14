// TIP-030b F1 — E2E mock: hợp đồng từ tệp. Form "Tạo hợp đồng": chọn tệp ở ô "File hợp đồng" → kiểm tệp → bảng đề xuất (Dùng từng ô)
// → tạo Nháp nguồn tệp → tab Tệp thấy "Bản gốc". Tệp không an toàn → lý do + Thử lại / quay về mẫu. Tab Tệp của nháp: gắn tệp nguồn.
// F3 phụ lục: hợp đồng đã ký → tab Phụ lục → PL-n → trình duyệt → Owner ký (OTP riêng) → gửi link; trang ký phụ lục công khai.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { pdf } from '../../../fixtures/contracts/files/build-fixtures';
import { isMobile } from './support/mobile';
import { confirmPreview } from './support/confirm';

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
    await confirmPreview(page, { checklist: false });
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ duyệt');
  });
});

async function scribble(page: Page, pad: Locator) {
  await pad.scrollIntoViewIfNeeded();
  const b = (await pad.boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + 20);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.move(b.x + b.width - 20, b.y + 30, { steps: 8 });
  await page.mouse.up();
}

async function openTab(page: Page, code: string) {
  await page.goto(URL);
  await page.locator('[data-contract]').filter({ hasText: code }).first().click();
  const drawer = page.getByTestId('ct-drawer');
  await drawer.getByRole('tab', { name: 'Phụ lục' }).click();
  return drawer.getByTestId('ct-appendices');
}

test.describe('phụ lục hợp đồng — TIP-030b F3 (mock)', () => {
  test('đã ký → tạo PL-2 → trình duyệt → Owner ký (OTP phụ lục) → gửi link khách', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    const tab = await openTab(page, 'HĐ-1180');
    await expect(tab.getByTestId('ct-apx')).toHaveCount(1);
    await tab.getByTestId('ct-apx-new').click();
    const form = page.getByTestId('ct-apx-form');
    await form.getByTestId('ct-apx-title').fill('Dời lịch buổi 3');
    await form.getByTestId('ct-apx-content').fill('Buổi 3 dời sang thứ Bảy 12/12/2026.');
    await form.getByTestId('ct-apx-delta').fill('-200000');
    await form.getByTestId('ct-apx-save').click();
    await expect(form).toHaveCount(0);

    const item = tab.locator('[data-appendix="HĐ-1180/PL-2"]');
    await expect(item.getByTestId('ct-apx-status')).toHaveText('Nháp');
    await item.getByTestId('ct-apx-submit').click();
    await expect(item.getByTestId('ct-apx-status')).toHaveText('Chờ duyệt');
    await item.getByTestId('ct-apx-approve-open').click();
    const box = page.getByTestId('ct-apx-approve');
    await box.getByTestId('ct-apx-send-otp').click();
    await expect(box).toContainText('Mã thử nghiệm: 975310');
    await box.getByTestId('ct-apx-otp').fill('975310');
    await scribble(page, box.getByTestId('ct-apx-sig'));
    await box.getByTestId('ct-apx-approve-ok').click();
    await expect(box).toHaveCount(0);
    await expect(item.getByTestId('ct-apx-status')).toHaveText('Chờ khách ký');
    await item.getByTestId('ct-apx-send').click();
    await expect(item.getByTestId('ct-apx-link')).toContainText('/sign/appendix/');
    await expect(item.getByTestId('ct-apx-trail')).toContainText('Gửi link');
  });

  // State mock nằm trong bộ nhớ trang — trang ký công khai dùng phụ lục mẫu HĐ-1180/PL-1 (như hợp đồng: tk_1181_demo).
  test('trang ký phụ lục: nội dung + Bên A đã ký → OTP → ký → chứng nhận SHA-256; link giả → hết hiệu lực', async ({ page }) => {
    await page.goto('/sign/appendix/apx_1180_demo');
    const sign = page.getByTestId('apx-sign-page');
    await expect(sign).toContainText('HĐ-1180/PL-1');
    await expect(sign).toContainText('Bên A đã ký phụ lục');
    await expect(sign.getByTestId('apx-sign-content')).toContainText('chăm sóc da');
    await sign.getByTestId('sign-consent').check();
    await sign.getByTestId('sign-get-otp').click();
    await sign.getByTestId('sign-otp').fill('864200');
    await scribble(page, sign.getByTestId('sign-pad'));
    await sign.getByTestId('sign-submit').click();
    await expect(sign.getByTestId('apx-sign-cert')).toContainText('Đã ký phụ lục HĐ-1180/PL-1');
    await expect(sign.getByTestId('apx-sign-sha')).toHaveText(/^[0-9a-f]{64}$/);
    await page.goto('/sign/appendix/apx_khong_ton_tai');
    await expect(page.getByTestId('apx-sign-invalid')).toBeVisible();
  });

  test('hợp đồng chưa ký → tab Phụ lục không cho tạo', async ({ page }) => {
    test.skip(isMobile(page), 'drawer desktop');
    const tab = await openTab(page, 'HĐ-1182');
    await expect(tab).toContainText('Chỉ tạo phụ lục cho hợp đồng đã ký.');
    await expect(tab.getByTestId('ct-apx-new')).toHaveCount(0);
  });
});
