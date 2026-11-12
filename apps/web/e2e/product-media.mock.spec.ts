// TIP-027b (mock): mô tả có định dạng — gõ bằng bàn phím thật (beforeinput), 5 nút định dạng, lưu → mở lại form còn đủ cấu trúc, tab Tổng
// quan hiển thị thẻ ngữ nghĩa (không chèn HTML: chữ `<b>` dán vào là chữ); Ctrl+Z hoàn tác. Ảnh / tài liệu: tải ảnh → ảnh đầu tiên là ảnh
// chính, ảnh thứ hai → đặt làm ảnh chính, dời thứ tự; ảnh động → lỗi rõ, không thêm; tài liệu PDF → dòng tệp; gỡ hỏi xác nhận; đổi sản phẩm
// không mang ảnh của sản phẩm trước; sales chỉ xem (không nút tải / gỡ). Mobile 390: không tràn ngang, nút trong tab Tệp chạm ≥ 44.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/products?session=authed,declared,trialSeen';

const openDrawer = async (page: Page, id: string, tab?: string) => {
  await page.locator(`[data-product="${id}"]`).click();
  const d = page.getByTestId('pd-drawer');
  if (tab) await d.getByRole('tab', { name: tab }).click();
  return d;
};
const png = (page: Page, name: string) =>
  page.getByTestId('pd-media-input').setInputFiles({ name, mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) });
const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

test.describe('product-media', () => {
  test('mô tả: gõ, đậm / danh sách số, dán chữ HTML, lưu → mở lại còn định dạng, Tổng quan hiện thẻ ngữ nghĩa', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const d = await openDrawer(page, 'pd_1');
    await d.getByTestId('pd-edit').click();
    const form = page.getByTestId('pd-form');
    const area = form.getByTestId('pd-f-desc');
    await area.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('Nâng cơ trẻ hoá');
    await page.keyboard.press('Shift+Home');
    await form.locator('[data-rt="bold"]').click();
    await expect(form.locator('[data-rt="bold"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Bước 1');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Bước 2');
    await page.keyboard.press('Shift+ArrowUp');
    await form.locator('[data-rt="olist"]').click();
    await expect(area.locator('[data-kind="ordered"]')).toHaveCount(2);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await form.locator('[data-rt="olist"]').click();
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', '<b>không đậm</b>');
      dt.setData('text/html', '<script>alert(1)</script>');
      document.querySelector('[data-testid="pd-f-desc"]')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(area).toContainText('<b>không đậm</b>');
    await expect(area.locator('script')).toHaveCount(0);
    // Ctrl+Z bỏ lần dán, Ctrl+Y làm lại.
    await page.keyboard.press('ControlOrMeta+Z');
    await expect(area).not.toContainText('<b>không đậm</b>');
    await page.keyboard.press('ControlOrMeta+Y');
    await expect(area).toContainText('<b>không đậm</b>');
    await form.getByTestId('pd-save').click();
    await expect(form).toBeHidden();

    const view = d.getByTestId('pd-desc-view');
    await expect(view.locator('strong')).toHaveText('Nâng cơ trẻ hoá');
    await expect(view.locator('ol li')).toHaveText(['Bước 1', 'Bước 2']);
    await expect(view.locator('p').last()).toHaveText('<b>không đậm</b>');
    await expect(view.locator('b, script')).toHaveCount(0);

    await d.getByTestId('pd-edit').click();
    const again = page.getByTestId('pd-form').getByTestId('pd-f-desc');
    await expect(again.locator('strong')).toHaveText('Nâng cơ trẻ hoá');
    await expect(again.locator('[data-kind="ordered"]')).toHaveCount(2);
  });

  test('ảnh / tài liệu: ảnh đầu là ảnh chính → đổi ảnh chính, dời thứ tự; ảnh động bị từ chối; PDF; gỡ có xác nhận', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const d = await openDrawer(page, 'pd_1', 'Tệp');
    const panel = d.getByTestId('pd-media');
    await expect(panel.getByTestId('pd-media-empty')).toBeVisible();

    await png(page, 'mat-truoc.png');
    await expect(panel.getByTestId('pd-media-image')).toHaveCount(1);
    await expect(panel.getByTestId('pd-media-image').first()).toHaveAttribute('data-primary', 'true');
    await expect(panel.getByTestId('pd-media-image').first().locator('img')).toHaveAttribute('src', /^blob:/);
    await png(page, 'mat-sau.png');
    await expect(panel.getByTestId('pd-media-image')).toHaveCount(2);

    await panel.getByRole('button', { name: 'Đặt mat-sau.png làm ảnh chính' }).click();
    await expect(panel.locator('[data-primary="true"]')).toContainText('mat-sau.png');
    await panel.getByRole('button', { name: 'Dời mat-sau.png lên trước' }).click();
    await expect(panel.getByTestId('pd-media-image').first()).toContainText('mat-sau.png');

    await png(page, 'animated.png');
    await expect(panel.getByTestId('pd-media-failed')).toContainText('không nhận ảnh động');
    await expect(panel.getByTestId('pd-media-image')).toHaveCount(2);

    await page.getByTestId('pd-media-input').setInputFiles({ name: 'Thông số.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
    await expect(panel.getByTestId('pd-media-doc')).toContainText('Thông số.pdf');

    // Mở lại drawer: còn nguyên (đọc lại từ chi tiết sản phẩm).
    await page.keyboard.press('Escape');
    const back = await openDrawer(page, 'pd_1', 'Tệp');
    await expect(back.getByTestId('pd-media-image')).toHaveCount(2);

    await back.getByTestId('pd-media-image').first().getByTestId('pd-media-detach').click();
    const ask = page.locator('.ant-modal-confirm');
    await expect(ask).toContainText('Tệp gốc vẫn được lưu');
    await ask.getByRole('button', { name: 'Gỡ' }).click();
    await expect(ask).toBeHidden();
    await expect(back.getByTestId('pd-media-image')).toHaveCount(1);
    await expect(back.locator('[data-primary="true"]')).toContainText('mat-truoc.png');

    // Đổi sản phẩm: không mang ảnh / trạng thái lỗi của sản phẩm trước.
    await page.keyboard.press('Escape');
    const other = await openDrawer(page, 'pd_2', 'Tệp');
    await expect(other.getByTestId('pd-media-empty')).toBeVisible();
    await expect(other.getByTestId('pd-media-failed')).toHaveCount(0);
  });

  test('sales chỉ xem: không tải lên / gỡ / đặt ảnh chính', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const d = await openDrawer(page, 'pd_1', 'Tệp');
    await png(page, 'a.png');
    await expect(d.getByTestId('pd-media-image')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await setRole(page, 'Sales');
    const ro = await openDrawer(page, 'pd_1', 'Tệp');
    await expect(ro.getByTestId('pd-media-image')).toHaveCount(1);
    await expect(ro.getByTestId('pd-media-upload')).toHaveCount(0);
    await expect(ro.getByTestId('pd-media-detach')).toHaveCount(0);
    await expect(ro.getByTestId('pd-media-primary')).toHaveCount(0);
  });

  test('mobile 390: tab Tệp không tràn ngang, nút chạm ≥ 44', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    const d = await openDrawer(page, 'pd_1', 'Tệp');
    await png(page, 'a.png');
    await expect(d.getByTestId('pd-media-image')).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(d.getByTestId('pd-media').locator('button'));
  });
});
