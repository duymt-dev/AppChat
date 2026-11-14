// TIP-033b — E2E chế độ http trên backend thật: Cài đặt › Lịch hẹn (giờ mở cửa lưu tăng version, đọc lại sau reload) · liệu trình sinh
// thật (sản phẩm liệu trình → đơn xác nhận → thu đủ) hiện ở thẻ Liệu trình của Hồ sơ 360° (đã dùng / tổng / còn lại, không tiền) · xuất
// CSV liệu trình tải tệp THẬT (đúng cột còn lại, không tiền) · nhập "số dư liệu trình" bị từ chối 422 export_only (không kế hoạch nhập).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act<T>(page: Page, id: string, input: unknown, status = 200): Promise<T> {
  const r = await page.request.post(`/api/v1/actions/${id}`, { headers: { ...(await auth(page)), 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  expect(r.status(), await r.text()).toBe(status);
  return ((await r.json()) as { data: { result: T } }).data?.result as T;
}

test.describe('booking-operations (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Cài đặt Lịch hẹn: nghỉ Chủ nhật → Lưu → reload vẫn nghỉ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'booking-ops');
    await page.goto('/settings/booking');
    await expect(page.getByTestId('st-bk-hours')).toBeVisible();
    await page.getByTestId('st-bk-open-6').uncheck();
    await page.getByTestId('st-bk-save').click();
    await expect(page.getByTestId('st-bk-save')).toBeDisabled();
    await page.reload();
    await expect(page.getByTestId('st-bk-open-6')).not.toBeChecked();
  });

  test('liệu trình thật ở Hồ sơ 360° → xuất CSV tệp thật; nhập số dư bị từ chối', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'booking-pkg');
    const { contact_id } = await act<{ contact_id: string }>(page, 'contact.create', { full_name: 'Chị Lan Liệu Trình', phone: '0909 733 101' });
    const { product_id } = await act<{ product_id: string }>(page, 'product.create', { name: 'Liệu trình gội 6 buổi', type: 'package', price: '1800000', sessions: 6, valid_days: 90, tax_rate: 0 });
    const { order_id } = await act<{ order_id: string }>(page, 'order.create', { contact_id, items: [{ product_id, name: 'Liệu trình gội 6 buổi', qty: 1, unit_price: '1800000', tax_rate: 0 }] });
    await act(page, 'order.confirm', { order_id });
    const { invoice_id } = await act<{ invoice_id: string }>(page, 'invoice.create', { order_id, contact_id, kind: 'full', amount: '1800000' });
    await act(page, 'invoice.record_payment', { invoice_id, amount: '1800000', method: 'cash' });

    await page.goto('/customers');
    await page.locator(`[data-contact="${contact_id}"]`).click();
    const card = page.getByTestId('crm-360').getByTestId('pk-card');
    await expect(card).toContainText('Liệu trình gội 6 buổi', { timeout: 20_000 });
    await expect(card).toContainText('Đã dùng 0/6 buổi · còn 6');
    await expect(card).not.toContainText('1.800.000');

    const dl = page.waitForEvent('download');
    await card.getByTestId('pk-export-csv').click();
    const d = await dl;
    expect(d.suggestedFilename()).toMatch(/^lieu-trinh-.*\.csv$/);
    const file = await d.createReadStream();
    const text = await new Promise<string>((ok) => {
      let b = '';
      file.on('data', (c) => (b += c));
      file.on('end', () => ok(b));
    });
    expect(text).toContain('Còn lại');
    expect(text).toContain('Liệu trình gội 6 buổi,6,0,6,');
    expect(text).not.toContain('1800000');

    const r = await page.request.post('/api/v1/actions/transfer.plan', {
      headers: { ...(await auth(page)), 'idempotency-key': `tp-${Date.now()}` },
      data: { input: { entity: 'contact', dataset: 'customer_packages', file_id: '0190f000-0000-7000-8000-00000000f11e' } },
    });
    expect(r.status()).toBe(422);
    expect(((await r.json()) as { error: { fields: Record<string, string> } }).error.fields).toEqual({ dataset: 'export_only' });
  });
});
