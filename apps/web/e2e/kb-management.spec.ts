// TIP-020b — E2E mock: quản lý nguồn KB. Sửa thư mục (tên, mặc định "Chỉ nội bộ") → tải tài liệu vào thư mục không chọn quyền → tài liệu
// kế thừa nội bộ; trùng tên → lỗi, drawer vẫn mở; xoá thư mục có tài liệu → HAS_DEPENDENCIES, thư mục còn; thư mục trống → xoá được;
// nút tải tài liệu tải tệp thật (download event, đúng tên); 390: drawer không tràn ngang, nút chạm ≥ 44px.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/settings/rag_data?session=authed,declared,trialSeen';
const folderRow = (page: import('@playwright/test').Page, id: string) => page.locator(`[data-folder="${id}"]`);

test.describe('kb-management', () => {
  test('sửa thư mục → nội bộ; tài liệu mới kế thừa; trùng tên chặn; xoá có tài liệu bị chặn, thư mục trống xoá được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await folderRow(page, 'f_price').getByTestId('st-rag-folder-edit').click();
    const d = page.getByTestId('st-rag-folder-drawer');
    await expect(d.getByTestId('st-rag-folder-edit-name')).toHaveValue('Bảng giá');
    await d.getByTestId('st-rag-folder-edit-name').fill('catalogues');
    await d.getByTestId('st-rag-folder-save').click();
    await expect(page.locator('.ant-message-notice-error').first()).toBeVisible();
    await expect(d).toBeVisible();
    await d.getByTestId('st-rag-folder-edit-name').fill('Bảng giá nội bộ');
    await d.getByTestId('st-rag-folder-vis-internal').click();
    await d.getByTestId('st-rag-folder-save').click();
    await expect(d).toHaveCount(0);
    await expect(folderRow(page, 'f_price')).toContainText('Bảng giá nội bộ');

    await page.getByTestId('st-rag-upload').click();
    const m = page.getByTestId('st-rag-modal');
    await m.getByTestId('st-rag-name').fill('Giá đại lý.xlsx');
    await m.getByTestId('st-rag-folder-select').selectOption({ label: 'Bảng giá nội bộ' });
    await expect(m.getByTestId('st-rag-vis-internal')).toHaveAttribute('aria-checked', 'true');
    await expect(m.getByTestId('st-rag-vis-hint')).toContainText('theo mặc định của thư mục');
    await m.getByTestId('st-rag-modal-save').click();
    await expect(m).toHaveCount(0);
    await expect(page.locator('[data-doc]').filter({ hasText: 'Giá đại lý.xlsx' })).toBeVisible();

    await folderRow(page, 'f_price').getByTestId('st-rag-folder-edit').click();
    await d.getByTestId('st-rag-folder-del').click();
    await expect(page.locator('.ant-message-notice-error').first()).toBeVisible();
    await expect(folderRow(page, 'f_price')).toBeVisible();
    await d.getByRole('button', { name: 'Huỷ' }).click();

    await page.getByTestId('st-rag-folder').click();
    await page.getByTestId('st-rag-folder-name').fill('Thư mục tạm');
    await page.getByRole('button', { name: 'Tạo', exact: true }).click();
    const tmp = page.locator('[data-folder]').filter({ hasText: 'Thư mục tạm' });
    await tmp.getByTestId('st-rag-folder-edit').click();
    await d.getByTestId('st-rag-folder-del').click();
    await expect(tmp).toHaveCount(0);
  });

  test('nút tải tài liệu tải tệp thật đúng tên (không no-op)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const row = page.locator('[data-doc="kb_7"]');
    const dl = page.waitForEvent('download');
    await row.getByTestId('st-rag-dl').click();
    expect((await dl).suggestedFilename()).toBe('FAQ — Quy trình đơn hàng.md');
  });

  test('390: drawer sửa thư mục không tràn ngang, nút sửa / lưu ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    const edit = page.locator('[data-folder="f_cat"]').getByTestId('st-rag-folder-edit');
    await expect(edit).toBeVisible();
    await expectTouchTargets(edit);
    await edit.click();
    await expect(page.getByTestId('st-rag-folder-drawer')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
