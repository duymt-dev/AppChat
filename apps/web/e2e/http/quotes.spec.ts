// TIP-029 AC3 — E2E chế độ http: Báo giá trên backend thật — kết nối Email giả → tạo dịch vụ + khách (có email) → tạo báo giá
// (chọn dịch vụ từ catalog) → gửi Zalo khi khách chưa nhắn → báo lý do → gửi Email (PDF đóng băng qua LibreOffice + link xem vào hội
// thoại email mới — TIP-028b: tạo PDF ở job doc-render, drawer hiện "Đang tạo PDF" rồi tự xong) → Tải PDF → mở link xem công khai (không đăng nhập) → báo giá thành "Khách đã xem" → xin sửa → lần 2.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';
import { confirmPreview } from '../support/confirm';

test.describe('báo giá (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tạo → gửi email (PDF + link) → khách mở link → đã xem → xin sửa lần 2', async ({ page, browser, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(150_000);
    await onboarded(page, 'quotes');

    // Kênh Email giả (TIP-018).
    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-email').click();
    const w = page.getByTestId('st-ch-wizard');
    await w.getByTestId('st-ch-wizard-imap_host').fill('imap.fake.test');
    await w.getByTestId('st-ch-wizard-address').fill(`bg-${Date.now()}@spa-e2e.vn`);
    await w.getByTestId('st-ch-wizard-password').fill('app-password-e2e');
    await w.getByTestId('st-ch-wizard-test').click();
    await expect(w.getByTestId('st-ch-wizard-tested')).toBeVisible();
    await w.getByTestId('st-ch-wizard-next').click();
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);

    // Dịch vụ + khách.
    await page.goto('/products');
    await page.getByTestId('pd-add').click();
    const pf = page.getByTestId('pd-form');
    await pf.getByTestId('pd-f-type').selectOption('service');
    await pf.getByTestId('pd-f-name').fill('HIFU nâng cơ');
    await pf.getByTestId('pd-f-price').fill('1500000');
    await pf.getByTestId('pd-save').click();
    await expect(pf).toHaveCount(0);
    await page.goto('/customers');
    await page.getByTestId('crm-create').click();
    const cf = page.getByTestId('crm-create-modal');
    await cf.getByLabel('Họ và tên *').fill('Chị Lan');
    await cf.getByLabel('Số điện thoại *').fill('0909 777 001');
    await cf.getByLabel('Email').fill('lan@khach-e2e.vn');
    await page.getByTestId('crm-save').click();
    await expect(cf).toHaveCount(0);

    // Tạo báo giá.
    await page.goto('/quotes');
    await page.getByTestId('q-create').click();
    const form = page.getByTestId('q-form');
    await form.getByTestId('q-contact').selectOption({ label: 'Chị Lan' });
    await form.getByTestId('q-pick').selectOption({ label: 'HIFU nâng cơ · 1.500.000₫' });
    await form.getByTestId('q-line-qty').fill('2');
    await form.getByTestId('q-save').click();
    const drawer = page.getByTestId('q-drawer');
    await expect(drawer).toContainText('BG-1001');
    await expect(drawer).toContainText('Nháp');

    // Zalo: khách chưa nhắn → báo lý do, không gửi.
    await drawer.getByTestId('q-send-zalo').click();
    await expect(page.getByText('Khách chưa nhắn Zalo cho shop')).toBeVisible();

    // Email: mở chuỗi thư mới, PDF đóng băng (LibreOffice) — chờ lâu hơn bình thường.
    await drawer.getByRole('button', { name: 'Gửi Email' }).first().click();
    await confirmPreview(page);
    await expect(drawer).toContainText('Đã gửi', { timeout: 60_000 });
    // TIP-028b AC1: API trả ngay — PDF tạo ở worker ROLE=jobs (queue doc-render); dải "Đang tạo PDF" tự mất khi xong (WS document.render).
    // (job có thể xong trước khi kịp thấy dải — trạng thái chờ kiểm ở integration doc-render-queue + E2E mock).
    await expect(drawer.getByTestId('q-render')).toHaveCount(0, { timeout: 60_000 });

    // Tải PDF (bản đóng băng).
    const popup = context.waitForEvent('page');
    const pdf = page.waitForResponse((r) => /\/quotes\/[^/]+\/pdf$/.test(r.url()));
    await drawer.getByTestId('q-pdf').click();
    const res = await pdf;
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('application/pdf');
    await (await popup).close();

    // Link xem trong tin gửi khách (Hộp thư → hội thoại email của khách).
    await page.goto('/inbox');
    const row = page.getByTestId('conv-row').filter({ hasText: 'Chị Lan' });
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    await row.locator('button').first().click();
    const out = page.getByTestId('thread').getByTestId('msg-out').last();
    await expect(out).toContainText('BG-1001');
    const link = (await out.innerText()).match(/\/q\/[^\s]+/)![0];

    // Khách mở link (trình duyệt khác, không đăng nhập).
    const guest = await browser.newContext();
    const g = await guest.newPage();
    await g.goto(link);
    await expect(g.getByTestId('pq-title')).toContainText('BG-1001');
    await expect(g.getByTestId('pq-total')).toContainText('3.240.000');
    await expect(g.getByTestId('pq-pdf')).toBeVisible();
    await guest.close();

    // Nội bộ thấy "Khách đã xem" → khách xin sửa → lần 2.
    await page.goto('/quotes');
    await page.locator('[data-quote]').filter({ hasText: 'BG-1001' }).click();
    await expect(page.getByTestId('q-drawer')).toContainText('Khách đã xem');
    await page.getByTestId('q-drawer').getByTestId('q-revision').click();
    await expect(page.getByTestId('q-drawer')).toContainText('Lần 2');
  });
});
