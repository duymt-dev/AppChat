// TIP-023f E2E chế độ http (pnpm e2e:http assistant-input): backend thật — tải lên → assistant.attachment_prepare → worker ROLE=ai chạy
// parser trong sandbox tiến trình con (dist/parser.cjs) → ready; Gửi chỉ tệp → engine dựng nội dung + vị trí trang NGAY trước lời gọi
// model (model giả `AI_ENGINE=mock` nhắc lại đầu prompt — câu trả lời chứa khối tệp đã parse, không chỉ tên); PDF có mật khẩu → lỗi có lý do,
// Gửi khoá. Hydrate / vision / nguồn mất quyền / replay ở integration `assistant-input-turn`.
import { expect, test } from '@playwright/test';
import { badPdf, pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('Trợ lý — đầu vào tệp (http)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await spoofIp(page);
  });

  test('PDF thật → parse trong sandbox → sẵn sàng → gửi chỉ tệp → model nhận khối tệp đã parse; PDF có mật khẩu → lỗi có lý do', async ({ page }) => {
    await onboarded(page, 'asstinput');
    await page.goto('/assistant');
    await page.getByTestId('asst-attach-input').setInputFiles({ name: 'bao-gia.pdf', mimeType: 'application/pdf', buffer: pdf({ pages: 2, text: 'HTTPCANARY77' }) });
    const chip = page.getByTestId('asst-attachment');
    await expect(chip).toHaveAttribute('data-status', 'ready', { timeout: 60_000 });
    await page.getByTestId('asst-send').click();
    await expect(page.getByTestId('asst-user-file')).toContainText('bao-gia.pdf');
    const reply = page.getByTestId('asst-ai-msg').last();
    await expect(reply).toContainText('Đã nhận:', { timeout: 30_000 });
    // Model giả nhắc lại 200 ký tự đầu prompt: khối `<attachment … kind="pdf">` chỉ có khi artifact đã parse (sandbox) và engine dựng
    // nội dung trước lời gọi; chữ trong trang + nhãn [page N] kiểm đầy đủ ở integration `assistant-input-turn` (SDK prompt thật).
    await expect(reply).toContainText('<attachment name="bao-gia.pdf" kind="pdf"');
    await expect(page.getByTestId('asst-attachments')).toHaveCount(0);

    await page.locator('textarea').last().fill('Tệp này nói gì?');
    await page.getByTestId('asst-attach-input').setInputFiles({ name: 'hong.pdf', mimeType: 'application/pdf', buffer: badPdf.encrypted() });
    await expect(chip).toHaveAttribute('data-status', 'error', { timeout: 60_000 });
    await expect(chip.getByTestId('asst-attachment-reason')).not.toBeEmpty();
    await expect(page.getByTestId('asst-send').last()).toBeDisabled();
  });
});
