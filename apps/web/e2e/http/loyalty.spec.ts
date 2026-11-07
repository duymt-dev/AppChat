// TIP-036 — E2E chế độ http (pnpm e2e:http): Khách thân thiết trên backend thật. Điều chỉnh điểm qua hộp "Thêm thành viên & ghi nhận
// điểm" → danh sách / drawer hiện số dư DB (reload vẫn đúng) → bấm toast hoàn tác → về như cũ; cấu hình hệ số lưu + reload; tab Tệp tải
// lên (purpose attachment → loyalty.attach_file) → reload còn tệp, mở tệp tải bytes thật; tab AI gửi lượt thật tới Trợ lý (không toast giả);
// đơn hoàn tất có thu → worker jobs cộng điểm (consumer loyalty.orders) → lịch sử điểm hiện dòng tích của đơn.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act<T>(page: Page, id: string, input: unknown): Promise<T> {
  const r = await page.request.post(`/api/v1/actions/${id}`, { headers: { ...(await auth(page)), 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  expect(r.status(), await r.text()).toBe(200);
  return ((await r.json()) as { data: { result: T } }).data.result;
}

test.describe('khách thân thiết (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('điều chỉnh → DB thật sau reload → hoàn tác; cấu hình hệ số lưu; tệp tải lên + mở; AI gửi lượt thật', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'loyalty');
    const { contact_id } = await act<{ contact_id: string }>(page, 'contact.create', { full_name: 'Chị Lan Điểm', phone: '0909 736 001' });

    await page.goto('/loyalty');
    await page.getByTestId('ly-add').click();
    const m = page.getByTestId('ly-adjust');
    await m.getByTestId('ly-adj-phone').fill('0909 736 001');
    await m.getByTestId('ly-adj-lookup').click();
    await m.getByTestId('ly-adj-points').fill('600');
    await m.getByTestId('ly-adj-save').click();
    await expect(m).toHaveCount(0);
    const row = page.locator(`[data-member="${contact_id}"]`);
    await expect(row.getByTestId('ly-points')).toContainText('600');
    await page.reload();
    await expect(page.locator(`[data-member="${contact_id}"]`).getByTestId('ly-points')).toContainText('600');

    // Hoàn tác qua toast của lần điều chỉnh thứ hai.
    await page.getByTestId('ly-add').click();
    await m.getByTestId('ly-adj-phone').fill('0909 736 001');
    await m.getByTestId('ly-adj-lookup').click();
    await m.getByTestId('ly-adj-points').fill('50');
    await m.getByTestId('ly-adj-save').click();
    await expect(page.locator(`[data-member="${contact_id}"]`).getByTestId('ly-points')).toContainText('650');
    await page.locator('.ant-message-notice').filter({ hasText: 'Đã thực hiện' }).first().click();
    await expect(page.locator(`[data-member="${contact_id}"]`).getByTestId('ly-points')).toContainText('600');

    // Cấu hình hệ số Kim cương → reload vẫn đúng.
    await page.getByTestId('ly-config-open').click();
    const c = page.getByTestId('ly-config');
    await c.getByTestId('ly-cfg-mult-diamond').fill('2.5');
    await c.getByTestId('ly-cfg-save').click();
    await expect(c).toHaveCount(0);
    await page.reload();
    await page.getByTestId('ly-config-open').click();
    await expect(page.getByTestId('ly-config').getByTestId('ly-cfg-mult-diamond')).toHaveValue('2.5');
    await page.getByTestId('ly-config').getByRole('button', { name: 'Huỷ' }).click();

    // Tab Tệp: tải lên → reload còn tệp → mở tải bytes.
    await page.locator(`[data-member="${contact_id}"]`).click();
    const d = page.getByTestId('ly-drawer');
    await d.getByRole('tab', { name: 'Tệp' }).click();
    await expect(d.getByTestId('ly-files')).toContainText('Chưa có tệp đính kèm');
    await d.getByTestId('ly-file-input').setInputFiles({ name: 'Phiếu quà.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 loyalty') });
    await expect(d.locator('[data-file]')).toHaveCount(1);
    await page.reload();
    await page.locator(`[data-member="${contact_id}"]`).click();
    await d.getByRole('tab', { name: 'Tệp' }).click();
    await expect(d.locator('[data-file]')).toContainText('Phiếu quà.pdf');
    const download = page.waitForEvent('download');
    await d.locator('[data-file]').getByRole('button', { name: 'Mở' }).click();
    expect((await download).suggestedFilename()).toBe('Phiếu quà.pdf');

    // Tab AI: nhận định số thật, gợi ý gửi lượt thật (luồng trả lời hiện trong drawer).
    await d.getByRole('tab', { name: 'AI' }).click();
    await expect(d.getByTestId('ly-ai-insight')).toContainText('Bạc');
    await d.getByTestId('ly-ai-act-keep').click();
    await expect(d.getByTestId('ly-ai-msgs')).toBeVisible();
  });

  test('đơn hoàn tất đã thu → worker cộng điểm → lịch sử điểm có dòng tích của đơn', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'loyalty-earn');
    const { contact_id } = await act<{ contact_id: string }>(page, 'contact.create', { full_name: 'Anh Tích Điểm', phone: '0909 736 002' });
    const { product_id } = await act<{ product_id: string }>(page, 'product.create', { name: 'Gói chăm sóc', type: 'service', price: '500000' });
    const { order_id } = await act<{ order_id: string }>(page, 'order.create', { contact_id, items: [{ product_id, name: 'Gói chăm sóc', qty: 1, unit_price: '500000', tax_rate: 0 }] });
    await act(page, 'order.confirm', { order_id });
    const { invoice_id } = await act<{ invoice_id: string }>(page, 'invoice.create', { order_id, contact_id, kind: 'full', amount: '500000' });
    await act(page, 'invoice.record_payment', { invoice_id, amount: '500000', method: 'cash' });
    await act(page, 'order.complete', { order_id });

    await page.goto('/loyalty');
    await expect(async () => {
      await page.reload();
      await expect(page.locator(`[data-member="${contact_id}"]`).getByTestId('ly-points')).toContainText('50', { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await page.locator(`[data-member="${contact_id}"]`).click();
    const d = page.getByTestId('ly-drawer');
    await d.getByRole('tab', { name: 'Lịch sử' }).click();
    await expect(d.locator('[data-ledger="earn"]')).toContainText('Tích điểm đơn DH-');
  });
});
