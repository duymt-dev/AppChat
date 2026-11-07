// TIP-041 P3 — E2E chế độ mock: vùng nguy hiểm của Owner (Cài đặt › Tổng quan). Xoá: bản xem trước (gói còn lại + Credit mất, không hoàn
// tiền) → gõ tên + tick → gửi mã → sai mã báo trên form → đúng mã → thẻ "Workspace đang được xoá". Đóng băng: gửi lý do → trạng thái chờ →
// tab /admin?tab=freeze dựng được. Xuất: hộp liệt kê các danh sách xuất được. Không phải Owner không thấy vùng nguy hiểm. Mobile 390.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const OTP = '135790';

test.describe('vùng nguy hiểm Owner (mock)', () => {
  test('xoá: preview → mã sai → mã đúng → thẻ đang xoá', async ({ page }) => {
    await page.goto(`/settings/general${S}`);
    await page.getByTestId('st-dz-delete').click();
    const m = page.getByTestId('st-del-modal');
    await expect(m.getByTestId('st-del-preview')).toBeVisible();
    await expect(m.getByTestId('st-del-plan')).toContainText('18');
    await expect(m.getByTestId('st-del-credits')).toContainText('1.200');
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    await m.getByTestId('st-del-modal-save').click();
    await expect(m.getByTestId('st-del-error')).toBeVisible();
    await m.getByTestId('st-del-name').fill('MediaSoft Vietnam');
    await m.getByTestId('st-del-ack').check();
    await m.getByTestId('st-del-modal-save').click();
    await expect(m.getByTestId('st-del-otp')).toBeVisible();
    await m.getByTestId('st-del-otp').fill('000000');
    await m.getByTestId('st-del-modal-save').click();
    await expect(m.getByTestId('st-del-error')).toBeVisible();
    await m.getByTestId('st-del-otp').fill(OTP);
    await m.getByTestId('st-del-modal-save').click();
    await expect(page.getByTestId('deleting')).toBeVisible();
    await expect(page.getByTestId('deleting-logout')).toBeVisible();
  });

  test('đóng băng: gửi lý do → chờ; tab admin; xuất: liệt kê danh sách', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop (admin)');
    await page.goto(`/settings/general${S}`);
    await page.getByTestId('st-dz-freeze').click();
    await page.getByTestId('st-freeze-reason').fill('Tạm nghỉ kinh doanh 2 tháng');
    await page.getByTestId('st-freeze-modal-save').click();
    await expect(page.getByTestId('st-freeze-modal')).toHaveCount(0);
    await page.getByTestId('st-dz-freeze').click();
    await expect(page.getByTestId('st-freeze-status')).toHaveAttribute('data-status', 'pending');
    await expect(page.getByTestId('st-freeze-reason')).toHaveCount(0);
    await page.getByTestId('st-freeze-modal-save').click();

    await page.getByTestId('st-dz-export').click();
    for (const k of ['contact', 'quote', 'order', 'contract', 'ticket', 'product', 'invoice']) await expect(page.getByTestId(`st-export-${k}`)).toBeVisible();
    await page.getByTestId('st-export-modal-save').click();

    // Tab admin dựng được (trạng thái mock là của trang — duyệt / CAS kiểm ở test mock + integration).
    await page.goto(`/admin?tab=freeze${S.replace('?', '&')}`);
    await expect(page.getByTestId('adm-fr-table')).toBeVisible();
  });

  test('không phải Owner không thấy vùng nguy hiểm', async ({ page }) => {
    await page.goto(`/settings/general${S}`);
    await page.evaluate(() => window.localStorage.setItem('ac_mock_role', 'manager'));
    await page.reload();
    await expect(page.getByTestId('st-general-form')).toBeVisible();
    await expect(page.getByTestId('st-dz-delete')).toHaveCount(0);
  });
});
