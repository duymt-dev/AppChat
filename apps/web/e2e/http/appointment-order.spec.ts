// TIP-033c — E2E chế độ http: thẻ gợi ý tạo đơn trên backend thật. Lịch hoàn thành ngoài liệu trình (dựng qua action thật) → mở drawer
// → thẻ giá hiện hành; đổi giá dịch vụ SAU khi đã bấm tạo (xem trước đã cấp) → xác nhận → 409 stale → thẻ báo "đã đổi" + làm mới đúng giá
// mới, 0 đơn; tạo lại → biên nhận + mở đơn đúng tổng mới; mở lại drawer → không còn thẻ (lịch đã có đơn).
import { expect, test, type Page } from '@playwright/test';
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

test.describe('gợi ý tạo đơn từ lịch hẹn (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('thẻ giá hiện hành → đổi giá sau xem trước → "đã đổi", 0 đơn → tạo lại đúng giá mới → mở lại không còn thẻ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(150_000);
    await onboarded(page, 'apptorder');
    const svc = (await act<{ product_id: string }>(page, 'product.create', { name: 'Gội dưỡng sinh', type: 'service', price: '300000', tax_rate: 0, duration_min: 60 })).product_id;
    const staff = (await act<{ staff_id: string }>(page, 'staff.create', { name: 'KTV. Hoa', role: 'KTV' })).staff_id;
    const headers = await auth(page);
    const meta = ((await (await page.request.get('/api/v1/calendar/meta', { headers })).json()) as { data: { today: string } }).data;
    // Lịch hôm nay ở slot trống đầu tiên (danh sách mặc định của màn Lịch là hôm nay).
    const slot = (await act<{ slots: { start: string }[] }>(page, 'appointment.find_slots', { service_id: svc, date: meta.today })).slots[0]!;
    const a = (await act<{ appointment_id: string }>(page, 'appointment.create', { contact_name: 'Lê Gội Đầu', phone: '0909771234', service_id: svc, staff_id: staff, date: meta.today, start: slot.start.slice(-5), status: 'confirmed' })).appointment_id;
    await act(page, 'appointment.check_in', { appointment_id: a });
    await act(page, 'appointment.complete', { appointment_id: a });

    await page.goto('/calendar');
    await page.locator(`[data-appt="${a}"]`).click();
    const d = page.getByTestId('cal-drawer');
    const card = d.getByTestId('appt-order-card');
    await expect(card.getByTestId('appt-order-total')).toContainText('300.000');

    await card.getByTestId('appt-order-create').click();
    const dialog = page.getByRole('dialog', { name: 'Xác nhận thao tác' });
    await expect(dialog).toContainText('300.000');
    // Giá đổi giữa lúc xem trước và lúc xác nhận (người khác sửa sản phẩm).
    const p = ((await (await page.request.get(`/api/v1/products/${svc}`, { headers })).json()) as { data: { version: number } }).data;
    await act(page, 'product.update', { product_id: svc, patch: { price: '350000' }, if_version: p.version });
    await dialog.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(d.getByTestId('appt-order-changed')).toBeVisible();
    await expect(d.getByTestId('appt-order-created')).toHaveCount(0);

    // Thẻ làm mới đúng giá mới → tạo lại → biên nhận + mở đơn đúng tổng.
    await expect(card.getByTestId('appt-order-total')).toContainText('350.000');
    await card.getByTestId('appt-order-create').click();
    await page.getByRole('dialog', { name: 'Xác nhận thao tác' }).getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(d.getByTestId('appt-order-created')).toContainText(/DH-\d+/);
    await d.getByTestId('appt-order-open').click();
    const od = page.getByTestId('od-drawer');
    await expect(od).toContainText('Gội dưỡng sinh');
    await expect(od).toContainText('350.000');

    await page.goto('/calendar');
    await page.locator(`[data-appt="${a}"]`).click();
    await expect(page.getByTestId('cal-drawer').getByTestId('cal-status')).toHaveText('Hoàn thành');
    await expect(page.getByTestId('cal-drawer').getByTestId('appt-order-card')).toHaveCount(0);
  });
});
