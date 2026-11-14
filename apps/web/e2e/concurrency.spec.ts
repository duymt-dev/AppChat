// TIP-003e (mock) — AC2: đang mở hộp "Đóng ticket" thì bản ghi đổi (macro chuyển trạng thái phía sau) → lưu nhận 409 STALE_VERSION → hộp
// xung đột chung "Bản ghi vừa được người khác cập nhật"; "Giữ bản của tôi" không ghi đè, lý do đã chọn còn nguyên; "Tải lại" lấy version
// mới rồi lưu lại được. AC6: hành động đã gửi ra ngoài (gửi đề nghị thanh toán) → Nhật ký không có Hoàn tác, có "Ghi đính chính"; ghi xong
// hiện đính chính dưới hành động.
import { expect, test } from '@playwright/test';
import { isMobile } from './support/mobile';
import { confirmPreview } from './support/confirm';

const Q = '?session=authed,declared,trialSeen';

test.describe('concurrency', () => {
  test('AC2: 409 STALE_VERSION → hộp xung đột, giữ nội dung đang nhập, Tải lại rồi lưu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/tickets${Q}`);
    await page.locator('[data-ticket="tk_2041"]').click();
    const d = page.getByTestId('tk-drawer');
    await expect(d.getByTestId('tk-status')).toHaveText('Đang mở');
    await d.getByTestId('tk-close').click();
    const box = page.getByTestId('tk-close-box');
    await box.getByTestId('tk-close-reason').selectOption('duplicate');
    // Một ghi khác chen vào (macro "chuyển kỹ thuật" trên drawer phía sau) → version ticket tăng; hộp vẫn giữ version lúc mở.
    await page.evaluate(() => (document.querySelector('[data-testid="tk-macro-tech"]') as HTMLButtonElement | null)?.click());
    await expect(d.getByTestId('tk-status')).toHaveText('Đang xử lý');
    await box.getByTestId('tk-close-ok').click();
    const stale = page.getByRole('dialog', { name: 'Bản ghi vừa được người khác cập nhật' });
    await expect(stale).toBeVisible();
    await expect(stale.getByTestId('stale-version')).toContainText('Đóng ticket');
    await stale.getByTestId('stale-keep').click();
    await expect(stale).toBeHidden();
    await expect(box.getByTestId('tk-close-reason')).toHaveValue('duplicate');
    await expect(d.getByTestId('tk-status')).toHaveText('Đang xử lý');
    await box.getByTestId('tk-close-ok').click();
    await expect(stale).toBeVisible();
    await stale.getByTestId('stale-reload').click();
    await expect(stale).toBeHidden();
    await expect(box.getByTestId('tk-close-reason')).toHaveValue('duplicate');
    await box.getByTestId('tk-close-ok').click();
    await expect(box).toHaveCount(0);
    await expect(d.getByTestId('tk-status')).toHaveText('Đã đóng');
  });

  test('AC6: hành động đã gửi → không Hoàn tác, có Ghi đính chính; đính chính hiện trong nhật ký', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/invoices${Q}`);
    await page.locator('[data-invoice="inv_2037"]').click();
    const drawer = page.getByTestId('iv-drawer');
    await drawer.getByTestId('iv-send').click();
    await confirmPreview(page);
    await expect(drawer.getByTestId('iv-status')).toHaveText('Đã gửi');
    await page.keyboard.press('Escape');
    // Điều hướng trong app (giữ store mock) → Nhật ký hành động.
    await page.locator('[data-nav="assistant"]').hover();
    await page.getByTestId('flyout-assistant').getByText('Nhật ký hành động').click();
    const row = page.locator('[data-log]').filter({ hasText: 'invoice.send_payment_qr' }).first();
    await expect(row.getByTestId('log-undo')).toHaveCount(0);
    await row.getByTestId('log-correct-open').click();
    const modal = page.getByTestId('log-correct');
    await expect(modal).toContainText('không hoàn tác được');
    await expect(modal.getByTestId('log-correct-save')).toBeDisabled();
    await modal.getByTestId('log-correct-note').fill('Số tiền đúng là 2.500.000đ');
    await modal.getByTestId('log-correct-save').click();
    await expect(modal).toHaveCount(0);
    await expect(row.getByTestId('log-correction')).toHaveText('Đính chính: Số tiền đúng là 2.500.000đ');
    // Log không phải gửi (tạo mới, còn hạn hoàn tác) vẫn có Hoàn tác, không có Ghi đính chính.
    const created = page.locator('[data-log="al_seed_1"]');
    await expect(created.getByTestId('log-undo')).toBeVisible();
    await expect(created.getByTestId('log-correct-open')).toHaveCount(0);
  });
});
