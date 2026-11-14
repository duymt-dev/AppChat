// TIP-015e §1.3 (mock): kiểm tra trùng — nhãn hạng LUẬT (không %); tìm thật (không có kết quả → trạng thái rỗng thật, không regex giả);
// "Hợp nhất đã chọn" tắt khi chưa chọn, chỉ gộp cặp đã chọn theo bản chính đổi tay; mobile 390 không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/customers?session=authed,declared,trialSeen';

test.describe('contact-merge', () => {
  test('hạng luật, chỉ gộp cặp đã chọn, bản chính đổi tay', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('crm-dedupe').click();
    const groups = page.getByTestId('dd-group');
    await expect(groups).toHaveCount(3);
    await expect(groups.first().getByTestId('dd-rank')).toHaveText('Khớp mạnh');
    await expect(page.getByTestId('crm-dedupe-modal')).not.toContainText('%');
    await expect(page.getByTestId('dd-merge-picked')).toBeDisabled();

    const last = groups.last();
    const key = (await last.getAttribute('data-key'))!;
    const [, other] = key.split('~');
    await last.getByTestId('dd-pick').check();
    await last.getByTestId(`dd-side-${other}`).locator('input[type=radio]').check();
    await expect(page.getByTestId('dd-merge-picked')).toHaveText('Hợp nhất 1 cặp đã chọn');
    await page.getByTestId('dd-merge-picked').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(groups).toHaveCount(2);
    await expect(page.locator(`[data-key="${key}"]`)).toHaveCount(0);
  });

  test('tìm không ra → trạng thái rỗng thật; tìm theo tên lọc cặp', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByTestId('crm-dedupe').click();
    const input = page.getByRole('textbox', { name: /Nhập MST/ });
    await input.fill('khong ai trung');
    await input.press('Enter');
    await expect(page.getByTestId('dd-no-match')).toBeVisible();
    await expect(page.getByTestId('dd-group')).toHaveCount(0);
    await input.fill('tran quoc bao');
    await page.getByRole('button', { name: 'Kiểm tra' }).click();
    await expect(page.getByTestId('dd-group')).toHaveCount(1);
    await expect(page.getByTestId('dd-no-match')).toHaveCount(0);
  });

  test('khung 390: modal trùng không tràn ngang', async ({ page }) => {
    test.skip(isMobile(page), 'mở từ nút đầu màn (ẩn ở dự án mobile) rồi thu khung');
    await page.goto(URL);
    await page.getByTestId('crm-dedupe').click();
    await expect(page.getByTestId('dd-group').first()).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page);
  });
});
