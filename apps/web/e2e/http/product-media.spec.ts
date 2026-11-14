// TIP-027b — E2E chế độ http: sản phẩm trên backend thật (validator cô lập thật, image-bounds thật).
// Mô tả: gõ bằng bàn phím → đậm + danh sách số → lưu → đọc lại qua product.get có description_doc đúng cấu trúc + chữ thuần chiếu, mở lại
// form còn định dạng, Tổng quan hiện thẻ ngữ nghĩa. Ảnh / tài liệu: tải PNG → ảnh chính; PNG thứ hai → đặt làm ảnh chính → dời lên trước;
// APNG (ảnh động) và PNG 9000 px bị từ chối, không thêm; PDF → dòng tài liệu, "Mở" tải đúng bytes; mở lại drawer còn nguyên; gỡ ảnh chính
// có xác nhận → ảnh còn lại thành ảnh chính; sản phẩm khác không thấy tệp của sản phẩm này.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { pngOf } from '../../../../fixtures/product-media/images';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act<T = Record<string, unknown>>(page: Page, id: string, input: unknown): Promise<T> {
  const r = await page.request.post(`/api/v1/actions/${id}`, { headers: { ...(await auth(page)), 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  expect(r.status(), await r.text()).toBe(200);
  return ((await r.json()) as { data: { result: T } }).data.result;
}
const sha = (b: Buffer | Uint8Array) => createHash('sha256').update(b).digest('hex');
const openDrawer = async (page: Page, id: string, tab?: string) => {
  await page.locator(`[data-product="${id}"]`).click();
  const d = page.getByTestId('pd-drawer');
  if (tab) await d.getByRole('tab', { name: tab }).click();
  return d;
};
const pick = (page: Page, name: string, buffer: Buffer | Uint8Array, mimeType = 'image/png') => page.getByTestId('pd-media-input').setInputFiles({ name, mimeType, buffer: Buffer.from(buffer) });

test.describe('ảnh / mô tả sản phẩm (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('mô tả có định dạng: gõ → đậm + danh sách số → lưu → đọc lại đúng cấu trúc + chữ chiếu', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(150_000);
    await onboarded(page, 'pdmdesc');
    const p = (await act<{ product_id: string }>(page, 'product.create', { name: 'Serum mô tả', type: 'service', price: '450000', description: 'Cũ' })).product_id;
    await page.goto('/products');
    const d = await openDrawer(page, p);
    await d.getByTestId('pd-edit').click();
    const form = page.getByTestId('pd-form');
    await form.getByTestId('pd-f-desc').click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('Phục hồi da');
    await page.keyboard.press('Shift+Home');
    await page.keyboard.press('ControlOrMeta+B');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Sáng');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Tối <i>');
    await page.keyboard.press('Shift+ArrowUp');
    await form.locator('[data-rt="olist"]').click();
    await form.getByTestId('pd-save').click();
    await expect(form).toHaveCount(0);

    const got = await act<{ description: string; description_doc: { content: { type: string; content?: unknown[] }[] } }>(page, 'product.get', { product_id: p });
    expect(got.description).toBe('Phục hồi da\nSáng\nTối <i>');
    expect(got.description_doc.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'Phục hồi da', marks: ['bold'] }] },
      { type: 'ordered_list', content: [{ type: 'list_item', content: [{ type: 'text', text: 'Sáng' }] }, { type: 'list_item', content: [{ type: 'text', text: 'Tối <i>' }] }] },
    ]);
    const view = d.getByTestId('pd-desc-view');
    await expect(view.locator('strong')).toHaveText('Phục hồi da');
    await expect(view.locator('ol li')).toHaveText(['Sáng', 'Tối <i>']);
    await expect(view.locator('i')).toHaveCount(0);

    await page.reload();
    const again = await openDrawer(page, p);
    await again.getByTestId('pd-edit').click();
    const area = page.getByTestId('pd-form').getByTestId('pd-f-desc');
    await expect(area.locator('strong')).toHaveText('Phục hồi da');
    await expect(area.locator('[data-kind="ordered"]')).toHaveCount(2);
  });

  test('ảnh / tài liệu: ảnh chính, dời, ảnh động / quá cỡ bị từ chối, PDF tải đúng bytes, gỡ có xác nhận, sản phẩm khác không thấy', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(200_000);
    await onboarded(page, 'pdmmedia');
    const p = (await act<{ product_id: string }>(page, 'product.create', { name: 'Máy triệt lông', type: 'physical', price: '9000000' })).product_id;
    const other = (await act<{ product_id: string }>(page, 'product.create', { name: 'Kem chống nắng', type: 'physical', price: '350000' })).product_id;
    await page.goto('/products');
    const d = await openDrawer(page, p, 'Tệp');
    const panel = d.getByTestId('pd-media');
    await expect(panel.getByTestId('pd-media-empty')).toBeVisible();

    await pick(page, 'mat-truoc.png', pngOf(800, 600));
    await expect(panel.getByTestId('pd-media-image')).toHaveCount(1);
    await expect(panel.locator('[data-primary="true"]')).toContainText('mat-truoc.png');
    await pick(page, 'mat-sau.png', pngOf(640, 640));
    await expect(panel.getByTestId('pd-media-image')).toHaveCount(2);
    await panel.getByRole('button', { name: 'Đặt mat-sau.png làm ảnh chính' }).click();
    await expect(panel.locator('[data-primary="true"]')).toContainText('mat-sau.png');
    await panel.getByRole('button', { name: 'Dời mat-sau.png lên trước' }).click();
    await expect(panel.getByTestId('pd-media-image').first()).toContainText('mat-sau.png');

    // Bộ kiểm cấu trúc thật (tiến trình cô lập): APNG → ảnh động; 9000 px → quá cỡ. Không thêm ô ảnh.
    await pick(page, 'dong.png', pngOf(100, 100, true));
    await expect(panel.getByTestId('pd-media-failed')).toContainText('không nhận ảnh động');
    await pick(page, 'to.png', pngOf(9000, 100));
    await expect(panel.getByTestId('pd-media-failed')).toContainText('ảnh quá lớn');
    await expect(panel.getByTestId('pd-media-image')).toHaveCount(2);

    const body = pdf({ text: 'THONG SO KY THUAT 027B' });
    await pick(page, 'Thông số.pdf', body, 'application/pdf');
    const doc = panel.getByTestId('pd-media-doc').filter({ hasText: 'Thông số.pdf' });
    await expect(doc).toHaveCount(1);

    // Đọc lại từ server: thứ tự trong từng loại (khoá (kind, position, id)), đúng một ảnh chính.
    const list = await act<{ items: { name: string; is_primary: boolean; kind: string }[]; version: number }>(page, 'product.media_list', { product_id: p });
    const of = (k: string) => list.items.filter((m) => m.kind === k).map((m) => [m.name, m.is_primary]);
    expect(of('image')).toEqual([
      ['mat-sau.png', true],
      ['mat-truoc.png', false],
    ]);
    expect(of('document')).toEqual([['Thông số.pdf', false]]);

    // Mở lại drawer: "Mở" tải đúng bytes qua route đã kiểm quyền; ảnh xem trước là object URL (không link công khai).
    await page.keyboard.press('Escape');
    const back = await openDrawer(page, p, 'Tệp');
    await expect(back.getByTestId('pd-media-image').first().locator('img')).toHaveAttribute('src', /^blob:/);
    const dl = page.waitForEvent('download');
    await back.getByTestId('pd-media-doc').filter({ hasText: 'Thông số.pdf' }).getByRole('button', { name: /^Mở/ }).click();
    expect(sha(await readFile((await (await dl).path())!))).toBe(sha(body));

    // Gỡ ảnh chính có xác nhận → ảnh còn lại thành ảnh chính.
    await back.locator('[data-primary="true"]').getByTestId('pd-media-detach').click();
    const ask = page.locator('.ant-modal-confirm');
    await expect(ask).toContainText('Tệp gốc vẫn được lưu');
    await ask.getByRole('button', { name: 'Gỡ' }).click();
    await expect(ask).toBeHidden();
    await expect(back.getByTestId('pd-media-image')).toHaveCount(1);
    await expect(back.locator('[data-primary="true"]')).toContainText('mat-truoc.png');

    // Sản phẩm khác: media thuộc sản phẩm, không theo người tải.
    await page.keyboard.press('Escape');
    const o = await openDrawer(page, other, 'Tệp');
    await expect(o.getByTestId('pd-media-empty')).toBeVisible();
  });
});
