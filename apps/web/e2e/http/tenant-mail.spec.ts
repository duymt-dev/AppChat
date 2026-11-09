// TIP-012c — E2E chế độ http (pnpm e2e:http): mail của DN trên backend thật + Brevo giả của lượt E2E (TENANT_MAIL_TRANSPORT=fake — không
// mạng, người gửi đã kích hoạt cố định `news@ai-live.test`). Thẻ Brevo ở Nền tảng kết nối mở Cài đặt › Email Marketing → kết nối qua hộp
// tích hợp chung → thăm dò bền (worker ROLE=jobs) ghi người gửi → "Đã xác minh"; wizard Email chọn người gửi mail của DN tường minh → nháp
// lưu người gửi đã chốt (tải lại vẫn đúng — dữ liệu từ DB).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}

test.describe('mail của doanh nghiệp (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('kết nối Brevo ở Email Marketing → người gửi đã xác minh → wizard chọn người gửi → nháp giữ người gửi đã chốt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(180_000);
    await onboarded(page, 'tenant-mail');
    const r = await page.request.post('/api/v1/actions/contact.create', {
      headers: { ...(await auth(page)), 'idempotency-key': `tm-${Date.now()}` },
      data: { input: { full_name: 'Khách Mail E2E', email: 'khach-mail-e2e@khach.test' } },
    });
    expect(r.status(), await r.text()).toBe(200);

    await page.goto('/settings/integrations');
    await page.locator('[data-connector="brevo"]').click();
    await expect(page).toHaveURL(/\/settings\/email_mkt/);
    await page.getByTestId('st-em-connect').click();
    const m = page.getByTestId('st-int-modal');
    await m.getByTestId('st-int-f-api_key').fill('xkeysib-e2e-accept-000000000000');
    await m.getByTestId('st-int-f-sender_email').fill('news@ai-live.test');
    await m.getByTestId('st-int-save').click();
    await expect(m).toHaveCount(0);
    // Thăm dò bền chạy ở worker ROLE=jobs → người gửi đọc lại từ DB.
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId('st-em-sender')).toHaveAttribute('data-usable', 'true', { timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
    await expect(page.getByTestId('st-em-senders')).toContainText('news@ai-live.test');
    await expect(page.getByTestId('st-em-senders')).not.toContainText('xkeysib');

    await page.goto('/marketing');
    await page.getByTestId('mk-create').click();
    const w = page.getByTestId('mk-wizard');
    await w.getByTestId('mk-wiz-ch-email').click();
    await w.getByTestId('mk-wiz-next').click();
    await w.locator('[data-cust]').filter({ hasText: 'Khách Mail E2E' }).click();
    await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-name').fill('Bản tin E2E Brevo');
    await w.getByTestId('mk-wiz-subject').fill('Ưu đãi E2E');
    await w.getByTestId('mk-wiz-body').fill('Chào {ten}');
    await w.getByTestId('mk-wiz-next').click();
    const pick = w.getByTestId('mk-wiz-sender');
    const value = await pick.locator('option', { hasText: 'news@ai-live.test' }).getAttribute('value');
    expect(value).toMatch(/^mail:/);
    await pick.selectOption(value!);
    await w.getByTestId('mk-wiz-draft').click();
    await expect(w).toHaveCount(0);

    await page.reload();
    await page.locator('[data-campaign]').filter({ hasText: 'Bản tin E2E Brevo' }).first().click();
    await page.getByTestId('mk-detail').getByTestId('mk-dtab-content').click();
    await expect(page.getByTestId('mk-content')).toContainText('news@ai-live.test');
  });
});
