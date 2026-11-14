// TIP-032d — E2E chế độ http: tab Tệp của đơn / đề nghị trên backend thật (validator cô lập thật). Đơn + đề nghị dựng qua action → mở
// drawer → tab Tệp trống → chọn PDF → tải kèm đích + kiểm cấu trúc + gắn → dòng mới tên thật; mở lại vẫn còn; "Mở" tải đúng bytes; gỡ có
// xác nhận → mất khỏi danh sách. Tệp HTML đổi đuôi .pdf → lỗi rõ, không thêm dòng. Đề nghị: gắn ủy nhiệm chi riêng; đơn khác không thấy
// tệp của đơn này (danh sách theo bản ghi, không theo người tải).
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { pdf } from '../../../../fixtures/contracts/files/build-fixtures';
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
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const filesTab = async (page: Page, drawer: string) => {
  const d = page.getByTestId(drawer);
  await d.getByRole('tab', { name: 'Tệp' }).click();
  return d;
};

test.describe('tệp đính kèm đơn / đề nghị (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('đơn: tải PDF → gắn → còn sau khi mở lại → Mở đúng bytes → gỡ có xác nhận; HTML giả PDF bị từ chối; đơn khác không thấy', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(150_000);
    await onboarded(page, 'recfiles');
    const lan = (await act<{ contact_id: string }>(page, 'contact.create', { full_name: 'Chị Lan Tệp', phone: '0909322501' })).contact_id;
    const item = { name: 'Gói tệp', qty: 1, unit_price: '500000', tax_rate: 0 };
    const order = (await act<{ order_id: string }>(page, 'order.create', { contact_id: lan, items: [item] })).order_id;
    const other = (await act<{ order_id: string }>(page, 'order.create', { contact_id: lan, items: [item] })).order_id;

    await page.goto('/orders');
    await page.locator(`[data-order="${order}"]`).click();
    const d = await filesTab(page, 'od-drawer');
    const panel = d.getByTestId('rf-order');
    await expect(panel.getByTestId('rf-order-empty')).toBeVisible();

    const body = pdf({ text: 'BIEN BAN GIAO HTTP 501' });
    await page.getByTestId('rf-order-input').setInputFiles({ name: 'Biên bản giao.pdf', mimeType: 'application/pdf', buffer: body });
    await expect(panel.getByTestId('rf-order-row')).toHaveCount(1);
    await expect(panel.getByTestId('rf-order-row')).toContainText('Biên bản giao.pdf');

    // HTML đổi đuôi .pdf → cổng tải lên / kiểm cấu trúc từ chối, không thêm dòng.
    await page.getByTestId('rf-order-input').setInputFiles({ name: 'gia-mao.pdf', mimeType: 'application/pdf', buffer: Buffer.from('<!doctype html><script>alert(1)</script>') });
    await expect(panel.getByTestId('rf-order-error')).toBeVisible();
    await expect(panel.getByTestId('rf-order-row')).toHaveCount(1);

    // Mở lại drawer: danh sách đọc từ server.
    await page.keyboard.press('Escape');
    await page.locator(`[data-order="${order}"]`).click();
    const again = (await filesTab(page, 'od-drawer')).getByTestId('rf-order');
    const row = again.getByTestId('rf-order-row').filter({ hasText: 'Biên bản giao.pdf' });
    await expect(row).toHaveCount(1);
    const dl = page.waitForEvent('download');
    await row.getByRole('button', { name: /Mở/ }).click();
    expect(sha(await readFile((await (await dl).path())!))).toBe(sha(body));

    // Đơn khác: tệp thuộc bản ghi, không theo người tải.
    await page.keyboard.press('Escape');
    await page.locator(`[data-order="${other}"]`).click();
    await expect((await filesTab(page, 'od-drawer')).getByTestId('rf-order-empty')).toBeVisible();

    // Gỡ có xác nhận → mất khỏi danh sách.
    await page.keyboard.press('Escape');
    await page.locator(`[data-order="${order}"]`).click();
    const back = (await filesTab(page, 'od-drawer')).getByTestId('rf-order');
    await back.getByTestId('rf-order-row').filter({ hasText: 'Biên bản giao.pdf' }).getByTestId('rf-order-detach').click();
    const ask = page.locator('.ant-modal-confirm');
    await expect(ask).toContainText('Tệp gốc vẫn được lưu');
    await ask.getByRole('button', { name: 'Gỡ' }).click();
    await expect(back.getByTestId('rf-order-empty')).toBeVisible();
  });

  test('đề nghị: gắn ủy nhiệm chi → liệt kê đúng người gắn → gỡ được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(150_000);
    await onboarded(page, 'recfilesiv');
    const lan = (await act<{ contact_id: string }>(page, 'contact.create', { full_name: 'Anh Minh Tệp', phone: '0909322502' })).contact_id;
    const order = (await act<{ order_id: string }>(page, 'order.create', { contact_id: lan, items: [{ name: 'Gói đề nghị', qty: 1, unit_price: '800000', tax_rate: 0 }] })).order_id;
    const invoice = (await act<{ invoice_id: string }>(page, 'invoice.create', { order_id: order, contact_id: lan, kind: 'full', amount: '800000' })).invoice_id;

    await page.goto('/invoices');
    await page.locator(`[data-invoice="${invoice}"]`).click();
    const d = await filesTab(page, 'iv-drawer');
    const panel = d.getByTestId('rf-invoice');
    await page.getByTestId('rf-invoice-input').setInputFiles({ name: 'Uỷ nhiệm chi.pdf', mimeType: 'application/pdf', buffer: pdf({ text: 'UNC HTTP 502' }) });
    const mine = panel.locator('[data-testid="rf-invoice-row"][data-kind="user_attachment"]').filter({ hasText: 'Uỷ nhiệm chi.pdf' });
    await expect(mine).toHaveCount(1);
    await expect(mine.getByTestId('rf-invoice-detach')).toBeVisible();
    await mine.getByTestId('rf-invoice-detach').click();
    await page.locator('.ant-modal-confirm').getByRole('button', { name: 'Gỡ' }).click();
    await expect(mine).toHaveCount(0);
  });
});
