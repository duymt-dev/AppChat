// TIP-030 — E2E chế độ http: Hợp đồng trên backend thật — kết nối Email giả → khách (có email) → tạo hợp đồng → trình duyệt →
// Duyệt & ký (OTP thật gửi email chủ sở hữu + ký tay; PDF nội dung đóng băng qua LibreOffice) → gửi ký qua Email (link một lần vào
// hội thoại email mới) → khách mở link (không đăng nhập) → OTP vào hội thoại → ký → chứng nhận + SHA-256 → nội bộ thấy Đã ký, tải PDF.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, otpOf, spoofIp } from './support';
import { confirmPreview } from '../support/confirm';

async function scribble(page: Page, pad: Locator) {
  await pad.scrollIntoViewIfNeeded();
  const b = (await pad.boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + 20);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.move(b.x + b.width - 20, b.y + 30, { steps: 8 });
  await page.mouse.up();
}

/** Tin gửi khách gần nhất trong hội thoại email của khách (Hộp thư). */
async function lastOut(page: Page, who: string) {
  await page.goto('/inbox');
  const row = page.getByTestId('conv-row').filter({ hasText: who });
  await expect(row).toHaveCount(1, { timeout: 15_000 });
  await row.locator('button').first().click();
  return page.getByTestId('thread').getByTestId('msg-out').last();
}

test.describe('hợp đồng (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tạo → duyệt & ký (OTP email) → gửi ký email → khách ký trên link → Đã ký + PDF', async ({ page, browser, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(180_000);
    const owner = await onboarded(page, 'contracts');

    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-email').click();
    const w = page.getByTestId('st-ch-wizard');
    await w.getByTestId('st-ch-wizard-imap_host').fill('imap.fake.test');
    await w.getByTestId('st-ch-wizard-address').fill(`hd-${Date.now()}@spa-e2e.vn`);
    await w.getByTestId('st-ch-wizard-password').fill('app-password-e2e');
    await w.getByTestId('st-ch-wizard-test').click();
    await expect(w.getByTestId('st-ch-wizard-tested')).toBeVisible();
    await w.getByTestId('st-ch-wizard-next').click();
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);

    await page.goto('/customers');
    await page.getByTestId('crm-create').click();
    const cf = page.getByTestId('crm-create-modal');
    await cf.getByLabel('Họ và tên *').fill('Chị Hoa');
    await cf.getByLabel('Số điện thoại *').fill('0909 777 101');
    await cf.getByLabel('Email').fill('hoa@khach-e2e.vn');
    await page.getByTestId('crm-save').click();
    await expect(cf).toHaveCount(0);

    // Tạo + trình duyệt.
    await page.goto('/contracts');
    await page.getByTestId('ct-create').click();
    const form = page.getByTestId('ct-form');
    await form.getByTestId('ct-contact').selectOption({ label: 'Chị Hoa' });
    await form.getByTestId('ct-value').fill('12.000.000');
    await form.getByTestId('ct-start_date').fill('2026-12-01');
    await form.getByTestId('ct-end_date').fill('2027-11-30');
    await form.getByTestId('ct-save').click();
    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer).toContainText('HĐ-1001');
    await expect(drawer.getByTestId('ct-status')).toHaveText('Nháp');
    await drawer.getByTestId('ct-submit').click();
    await confirmPreview(page);
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ duyệt');

    // Duyệt & ký: OTP thật gửi email chủ sở hữu.
    await drawer.getByTestId('ct-approve-sign').click();
    const box = page.getByTestId('ct-approve-box');
    await box.getByTestId('ct-send-otp').click();
    await expect(page.getByText(/Đã gửi mã OTP tới/)).toBeVisible();
    await box.getByTestId('ct-otp').fill(await otpOf(owner));
    await scribble(page, box.getByTestId('ct-sig'));
    await box.getByTestId('ct-approve-ok').click();
    await confirmPreview(page);
    await expect(box).toHaveCount(0, { timeout: 60_000 });
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ ký');

    // Gửi ký qua Email → link ký trong drawer + trong tin gửi khách.
    await drawer.getByTestId('ct-send-sign').click();
    await page.getByTestId('ct-send-email').click();
    await confirmPreview(page);
    await expect(drawer.getByTestId('ct-sign-link')).toContainText('/sign/', { timeout: 30_000 });
    const out = await lastOut(page, 'Chị Hoa');
    await expect(out).toContainText('HĐ-1001');
    const link = (await out.innerText()).match(/\/sign\/[^\s]+/)![0];

    // Khách (trình duyệt khác, không đăng nhập): đồng ý → OTP (vào hội thoại email) → ký tay → Ký.
    const guest = await browser.newContext();
    const g = await guest.newPage();
    await g.goto(link);
    await expect(g.getByTestId('sign-page')).toContainText('HĐ-1001');
    await g.getByTestId('sign-consent').check();
    await g.getByTestId('sign-get-otp').click();
    await expect(g.getByText(/Mã OTP đã gửi/)).toBeVisible();
    const otpMsg = await lastOut(page, 'Chị Hoa');
    await expect(otpMsg).toContainText('Mã xác thực ký hợp đồng');
    const otp = (await otpMsg.innerText()).match(/\b(\d{6})\b/)![1]!;
    await expect(g.getByText(/Mã OTP đã gửi qua email/)).toBeVisible();
    await g.getByTestId('sign-otp').fill(otp);
    await scribble(g, g.getByTestId('sign-pad'));
    await g.getByTestId('sign-submit').click();
    const cert = g.getByTestId('sign-cert');
    await expect(cert).toContainText('Đã ký hợp đồng thành công', { timeout: 60_000 });
    await expect(cert.getByTestId('sign-sha')).toHaveText(/^[0-9a-f]{64}$/);
    await guest.close();

    // Nội bộ: Đã ký + tải PDF bản cuối.
    await page.goto('/contracts');
    await page.locator('[data-contract]').filter({ hasText: 'HĐ-1001' }).first().click();
    await expect(page.getByTestId('ct-drawer').getByTestId('ct-status')).toHaveText('Đã ký');
    const popup = context.waitForEvent('page');
    const pdf = page.waitForResponse((r) => /\/contracts\/[^/]+\/pdf$/.test(r.url()));
    await page.getByTestId('ct-drawer').getByTestId('ct-pdf').click();
    const res = await pdf;
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
    await (await popup).close();
  });
});
