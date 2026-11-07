// TIP-020b — E2E http: quản lý nguồn KB trên backend thật. Thư mục mặc định "Chỉ nội bộ" (sửa qua drawer, lưu DB — reload vẫn đúng) →
// tải tệp tên có dấu vào thư mục không chọn quyền → nguồn internal (đọc /settings/kb từ API); nút tải về đúng byte + tên UTF-8; xoá thư mục
// còn tài liệu → lỗi, thư mục còn sau reload.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const BODY = Buffer.from('# Bảng giá đại lý\n\nGói A: 450.000đ cho đại lý cấp 1.\n', 'utf8');
const NAME = 'Bảng giá đại lý.md';
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

test.describe('quản lý nguồn KB (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('thư mục nội bộ → tài liệu kế thừa; tải về đúng byte; xoá thư mục có tài liệu bị chặn', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'kbm');
    await page.goto('/settings/rag_data');
    await page.getByTestId('st-rag-folder').click();
    await page.getByTestId('st-rag-folder-name').fill('Giá đại lý');
    await page.getByRole('button', { name: 'Tạo', exact: true }).click();
    const folder = page.locator('[data-folder]').filter({ hasText: 'Giá đại lý' });
    await folder.getByTestId('st-rag-folder-edit').click();
    const d = page.getByTestId('st-rag-folder-drawer');
    await d.getByTestId('st-rag-folder-vis-internal').click();
    await d.getByTestId('st-rag-folder-save').click();
    await expect(d).toHaveCount(0);
    await page.reload();
    await page.locator('[data-folder]').filter({ hasText: 'Giá đại lý' }).getByTestId('st-rag-folder-edit').click();
    await expect(d.getByTestId('st-rag-folder-vis-internal')).toHaveAttribute('aria-checked', 'true');
    await d.getByRole('button', { name: 'Huỷ' }).click();

    await page.getByTestId('st-rag-upload').click();
    const m = page.getByTestId('st-rag-modal');
    await m.getByTestId('st-rag-file').setInputFiles({ name: NAME, mimeType: 'text/markdown', buffer: BODY });
    await m.getByTestId('st-rag-folder-select').selectOption({ label: 'Giá đại lý' });
    await expect(m.getByTestId('st-rag-vis-internal')).toHaveAttribute('aria-checked', 'true');
    await m.getByTestId('st-rag-modal-save').click();
    await expect(m).toHaveCount(0);
    const row = page.locator('[data-doc]').filter({ hasText: NAME });
    await expect(row).toBeVisible();
    // Nguồn lưu internal ở DB (đọc API, không tin UI).
    const kb = await page.evaluate(async () => {
      const t = ((await (await fetch('/api/v1/auth/refresh', { method: 'POST' })).json()) as { data: { access_token: string } }).data.access_token;
      const s = ((await (await fetch('/api/v1/session', { headers: { authorization: `Bearer ${t}` } })).json()) as { data: { workspace_id: string } }).data.workspace_id;
      return (await (await fetch('/api/v1/settings/kb?nav=all', { headers: { authorization: `Bearer ${t}`, 'x-workspace-id': s } })).json()) as { data: { data: { name: string; visibility: string }[] } };
    });
    expect(kb.data.data.find((x) => x.name === NAME)?.visibility).toBe('internal');

    const dl = page.waitForEvent('download');
    await row.getByTestId('st-rag-dl').click();
    const file = await dl;
    expect(file.suggestedFilename()).toBe(NAME);
    expect(sha(readFileSync((await file.path())!))).toBe(sha(BODY));

    await page.locator('[data-folder]').filter({ hasText: 'Giá đại lý' }).getByTestId('st-rag-folder-edit').click();
    await d.getByTestId('st-rag-folder-del').click();
    await expect(page.locator('.ant-message-notice-error').first()).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-folder]').filter({ hasText: 'Giá đại lý' })).toBeVisible();
  });
});
