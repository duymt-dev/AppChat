// TIP-020 AC7 — E2E chế độ http (pnpm e2e:http): trang Dữ liệu RAG trên backend thật — tải tệp .md thật (POST /v1/files) → kb.add_source
// → worker ROLE=ai nạp (embedding giả) → hàng hiện "Đã học" không cần tải lại; tạo thư mục; xoá vào thùng rác; tải lại vẫn đúng (từ DB).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('dữ liệu RAG (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tải tài liệu → AI học xong; thư mục mới; thùng rác', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'rag');
    await page.goto('/settings/rag_data');
    await expect(page.locator('[data-doc]')).toHaveCount(0);

    await page.getByTestId('st-rag-folder').click();
    await page.getByTestId('st-rag-folder-name').fill('Chính sách');
    await page.getByRole('button', { name: 'Tạo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Chính sách' })).toBeVisible();

    await page.getByTestId('st-rag-upload').click();
    const m = page.getByTestId('st-rag-modal');
    await m.getByTestId('st-rag-file').setInputFiles({ name: 'Đổi trả.md', mimeType: 'text/markdown', buffer: Buffer.from('# Đổi trả\n\nKhách được đổi liệu trình trong 7 ngày nếu chưa dùng buổi nào.\n') });
    await expect(m.getByTestId('st-rag-name')).toHaveValue('Đổi trả.md');
    await m.getByTestId('st-rag-folder-select').selectOption({ label: 'Chính sách' });
    await m.getByTestId('st-rag-modal-save').click();
    await expect(m).toHaveCount(0);
    const row = page.locator('[data-doc]').filter({ hasText: 'Đổi trả.md' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Đã học', { timeout: 30_000 });
    await expect(page.getByTestId('st-rag-nav-learned')).toContainText('1');

    await page.reload();
    await expect(page.locator('[data-doc]').filter({ hasText: 'Đổi trả.md' })).toContainText('Đã học');
    await page.locator('[data-doc]').filter({ hasText: 'Đổi trả.md' }).getByTestId('st-row-menu').click();
    await page.getByRole('menuitem', { name: 'Chuyển vào thùng rác' }).click();
    await expect(page.locator('[data-doc]')).toHaveCount(0);
    await expect(page.getByTestId('st-rag-nav-trash')).toContainText('1');
  });
});
