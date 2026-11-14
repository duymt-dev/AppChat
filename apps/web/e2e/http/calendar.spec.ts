// TIP-033 — E2E chế độ http: Lịch hẹn trên backend thật — dịch vụ (màn Sản phẩm) + nhân sự (staff.create qua API — chưa có màn cấu hình
// đặt lịch trong prototype) → tạo lịch từ slot trống (khách mới vào CRM, mã LH-) → trùng giờ bị loại khỏi slot → đổi giờ giữ
// mã → xác nhận → khách đến → hoàn thành → gợi ý đơn → tạo đơn từ lịch hẹn (DH-, nguồn lịch hẹn); lịch thứ hai huỷ có lý do.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

/** Phiên đang đăng nhập → header gọi API (refresh cookie → access token; workspace từ /session). */
async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act(page: Page, id: string, input: unknown) {
  const r = await page.request.post(`/api/v1/actions/${id}`, {
    headers: { ...(await auth(page)), 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` },
    data: { input },
  });
  expect(r.status(), await r.text()).toBe(200);
}
/** Lịch hẹn của khách trong 7 ngày tới (đọc thật từ /v1/calendar). */
async function apptOf(page: Page, name: string) {
  const headers = await auth(page);
  const today = ((await (await page.request.get('/api/v1/calendar/meta', { headers })).json()) as { data: { today: string } }).data.today;
  const to = new Date(Date.parse(`${today}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const rows = ((await (await page.request.get(`/api/v1/calendar?from=${today}&to=${to}`, { headers })).json()) as {
    data: { contact_name: string; code: string; start_at: string; reschedule_count: number }[];
  }).data;
  return rows.find((a) => a.contact_name === name)!;
}

test.describe('lịch hẹn (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tạo từ slot → đổi giờ giữ mã → xác nhận → đến → hoàn thành → tạo đơn từ lịch hẹn; huỷ có lý do', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'calendar');

    await page.goto('/products');
    await page.getByTestId('pd-add').click();
    const pf = page.getByTestId('pd-form');
    await pf.getByTestId('pd-f-type').selectOption('service');
    await pf.getByTestId('pd-f-name').fill('Massage thư giãn');
    await pf.getByTestId('pd-f-price').fill('450000');
    await pf.getByTestId('pd-f-duration').fill('60');
    await pf.getByTestId('pd-save').click();
    await expect(pf).toHaveCount(0);
    await act(page, 'staff.create', { name: 'KTV. Mai Lan', role: 'KTV' });

    await page.goto('/calendar');
    const book = async (name: string, start: string) => {
      await page.getByTestId('cal-create').click();
      const f = page.getByTestId('cal-form');
      await f.getByTestId('cal-customer').fill(name);
      await expect(f.getByTestId('cal-start').locator(`option[value="${start}"]`)).toHaveCount(1);
      await f.getByTestId('cal-start').selectOption(start);
      await expect(f.getByTestId('cal-end')).not.toHaveValue('');
      await f.getByTestId('cal-save').click();
      await expect(f).toHaveCount(0);
    };
    await book('Ngô Bảo Ngọc', '09:00');
    const d = page.getByTestId('cal-drawer');
    await expect(d.getByTestId('cal-status')).toHaveText('Chờ xác nhận');
    const first = await apptOf(page, 'Ngô Bảo Ngọc');
    expect(first.code).toMatch(/^LH-\d{4}$/);

    // 09:00 + 60′ + đệm 10′ → 09:30 / 10:00 không còn trong slot của KTV duy nhất.
    await d.getByTestId('cal-reschedule').click();
    const f = page.getByTestId('cal-form');
    await f.getByTestId('cal-start').selectOption('14:00');
    await f.getByTestId('cal-save').click();
    await expect(f).toHaveCount(0);
    await expect(d.getByTestId('cal-time')).toContainText('14:00');
    const moved = await apptOf(page, 'Ngô Bảo Ngọc');
    expect([moved.code, moved.start_at.slice(11, 16), moved.reschedule_count]).toEqual([first.code, '14:00', 1]);

    await d.getByTestId('cal-confirm').click();
    await expect(d.getByTestId('cal-status')).toHaveText('Đã xác nhận');
    await d.getByTestId('cal-checkin').click();
    await expect(d.getByTestId('cal-status')).toHaveText('Đã đến');
    await d.getByTestId('cal-complete').click();
    await expect(d.getByTestId('cal-status')).toHaveText('Hoàn thành');
    // TIP-033c: thẻ gợi ý (phép chiếu hiện hành) → xem trước bắt buộc → biên nhận → mở đơn.
    const card = d.getByTestId('appt-order-card');
    await expect(card).toContainText('Tạo đơn cho buổi này?');
    await expect(card.getByTestId('appt-order-total')).toContainText('486.000'); // 450.000 + thuế 8% mặc định
    await card.getByTestId('appt-order-create').click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(d.getByTestId('appt-order-created')).toContainText(/DH-\d+/);
    await d.getByTestId('appt-order-open').click();
    const od = page.getByTestId('od-drawer');
    await expect(od).toContainText(/DH-\d+/);
    await expect(od).toContainText('Massage thư giãn');
    await expect(od).toContainText('Ngô Bảo Ngọc');

    // Lịch thứ hai: huỷ bắt buộc lý do.
    await page.goto('/calendar');
    await book('Phương Vy', '10:30');
    await d.getByRole('button', { name: 'Thao tác khác' }).click();
    await page.getByText('Huỷ lịch hẹn', { exact: true }).click();
    const box = page.getByTestId('cal-cancel');
    await expect(box.getByTestId('cal-cancel-ok')).toBeDisabled();
    await box.getByTestId('cal-cancel-reason').fill('Khách bận');
    await box.getByTestId('cal-cancel-ok').click();
    await expect(d.getByTestId('cal-status')).toHaveText('Đã huỷ');
    await expect(d).toContainText('Khách bận');
  });
});
