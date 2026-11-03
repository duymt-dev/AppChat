// TIP-030b F1 AC4 — E2E http: hợp đồng từ tệp trên backend thật. Tải PDF ở form → guard 2 lớp + đề xuất giá trị (worker giới hạn) →
// Nháp nguồn tệp → trình duyệt → Duyệt & ký (OTP email) đóng băng chính bản PDF gốc → gửi ký Email → khách ký → bản cuối = bản gốc +
// trang chứng nhận; tab Tệp: Bản gốc + Đã ký, tải được. PDF có JavaScript → từ chối nêu lý do.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { badPdf, pdf } from '../../../../fixtures/contracts/files/build-fixtures';
import { isMobile } from '../support/mobile';
import { onboarded, otpOf, spoofIp } from './support';

async function scribble(page: Page, pad: Locator) {
  await pad.scrollIntoViewIfNeeded();
  const b = (await pad.boundingBox())!;
  await page.mouse.move(b.x + 20, b.y + 20);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
  await page.mouse.move(b.x + b.width - 20, b.y + 30, { steps: 8 });
  await page.mouse.up();
}

async function lastOut(page: Page, who: string) {
  await page.goto('/inbox');
  const row = page.getByTestId('conv-row').filter({ hasText: who });
  await expect(row).toHaveCount(1, { timeout: 15_000 });
  await row.locator('button').first().click();
  return page.getByTestId('thread').getByTestId('msg-out').last();
}

const TEXT = 'Ben B: Chi Mai - Gia tri hop dong: 9.500.000 dong - Thoi han: tu 01/12/2026 den 30/11/2027';

test.describe('hợp đồng từ tệp (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('tải PDF → đề xuất → Nháp nguồn tệp → duyệt & ký → gửi ký → khách ký → tab Tệp có bản gốc + đã ký', async ({ page, browser }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(180_000);
    const owner = await onboarded(page, 'ctfiles');

    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-email').click();
    const w = page.getByTestId('st-ch-wizard');
    await w.getByTestId('st-ch-wizard-imap_host').fill('imap.fake.test');
    await w.getByTestId('st-ch-wizard-address').fill(`hdf-${Date.now()}@spa-e2e.vn`);
    await w.getByTestId('st-ch-wizard-password').fill('app-password-e2e');
    await w.getByTestId('st-ch-wizard-test').click();
    await expect(w.getByTestId('st-ch-wizard-tested')).toBeVisible();
    await w.getByTestId('st-ch-wizard-next').click();
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);

    await page.goto('/customers');
    await page.getByTestId('crm-create').click();
    const cf = page.getByTestId('crm-create-modal');
    await cf.getByLabel('Họ và tên *').fill('Chị Mai');
    await cf.getByLabel('Số điện thoại *').fill('0909 777 202');
    await cf.getByLabel('Email').fill('mai@khach-e2e.vn');
    await page.getByTestId('crm-save').click();
    await expect(cf).toHaveCount(0);

    await page.goto('/contracts');
    await page.getByTestId('ct-create').click();
    const form = page.getByTestId('ct-form');
    // Tệp không an toàn: guard server nêu lý do.
    await form.getByTestId('ct-source-file').setInputFiles({ name: 'hd-js.pdf', mimeType: 'application/pdf', buffer: badPdf.javascript() });
    await expect(form.getByTestId('ct-source-err')).toContainText('nội dung tự chạy', { timeout: 30_000 });
    // Tệp hợp lệ: đọc chữ thật trong worker → đề xuất.
    await form.getByTestId('ct-source-file').setInputFiles({ name: 'HD dich vu Chi Mai.pdf', mimeType: 'application/pdf', buffer: pdf({ pages: 2, text: TEXT }) });
    await expect(form.getByTestId('ct-source-state')).toHaveText('Nguồn ký: HD dich vu Chi Mai.pdf', { timeout: 30_000 });
    const ex = form.getByTestId('ct-extract');
    await expect(ex.getByTestId('ct-extract-party_b')).toContainText('Chi Mai');
    for (const k of ['value', 'start_date', 'end_date']) await ex.getByTestId(`ct-use-${k}`).click();
    await expect(form.getByTestId('ct-value')).toHaveValue('9500000');
    await form.getByTestId('ct-contact').selectOption({ label: 'Chị Mai' });
    await form.getByTestId('ct-save').click();

    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer).toContainText('HĐ-1001');
    await drawer.getByTestId('ct-submit').click();
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ duyệt');
    await drawer.getByTestId('ct-approve-sign').click();
    const box = page.getByTestId('ct-approve-box');
    await box.getByTestId('ct-send-otp').click();
    await expect(page.getByText(/Đã gửi mã OTP tới/)).toBeVisible();
    await box.getByTestId('ct-otp').fill(await otpOf(owner));
    await scribble(page, box.getByTestId('ct-sig'));
    await box.getByTestId('ct-approve-ok').click();
    await expect(box).toHaveCount(0, { timeout: 60_000 });
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ ký');

    await drawer.getByTestId('ct-send-sign').click();
    await page.getByTestId('ct-send-email').click();
    await expect(drawer.getByTestId('ct-sign-link')).toContainText('/sign/', { timeout: 30_000 });
    const out = await lastOut(page, 'Chị Mai');
    const link = (await out.innerText()).match(/\/sign\/[^\s]+/)![0];

    const guest = await browser.newContext();
    const g = await guest.newPage();
    await g.goto(link);
    await expect(g.getByTestId('sign-page')).toContainText('HĐ-1001');
    await g.getByTestId('sign-consent').check();
    await g.getByTestId('sign-get-otp').click();
    await expect(g.getByText(/Mã OTP đã gửi/)).toBeVisible();
    const otp = (await (await lastOut(page, 'Chị Mai')).innerText()).match(/\b(\d{6})\b/)![1]!;
    await g.getByTestId('sign-otp').fill(otp);
    await scribble(g, g.getByTestId('sign-pad'));
    await g.getByTestId('sign-submit').click();
    await expect(g.getByTestId('sign-cert')).toContainText('Đã ký hợp đồng thành công', { timeout: 60_000 });
    await guest.close();

    // Nội bộ: Đã ký; tab Tệp có Bản gốc (bất biến) + bản Đã ký, tải bytes thật.
    await page.goto('/contracts');
    await page.locator('[data-contract]').filter({ hasText: 'HĐ-1001' }).first().click();
    const d = page.getByTestId('ct-drawer');
    await expect(d.getByTestId('ct-status')).toHaveText('Đã ký');
    await d.getByRole('tab', { name: 'Tệp' }).click();
    const files = d.getByTestId('ct-files');
    await expect(files.getByTestId('ct-file').filter({ hasText: 'Bản gốc' })).toContainText('HD dich vu Chi Mai.pdf');
    const signed = files.getByTestId('ct-file').filter({ hasText: 'Đã ký' });
    await expect(signed).toHaveCount(1);
    await expect(d.getByTestId('ct-file-upload')).toHaveCount(0);
    const dl = page.waitForEvent('download');
    const res = page.waitForResponse((r) => /\/contracts\/[^/]+\/files\/[^/]+$/.test(r.url()));
    await signed.getByTestId('ct-file-open').click();
    expect((await res).status()).toBe(200);
    expect((await res).headers()['content-type']).toBe('application/pdf');
    await dl;
  });

  test('AI soạn (model giả): đề xuất giá danh mục → nháp → gợi ý chặn trình duyệt → Giữ / Bỏ → Chờ duyệt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'ctaidraft');
    await page.goto('/products');
    await page.getByTestId('pd-add').click();
    const pf = page.getByTestId('pd-form');
    await pf.getByTestId('pd-f-type').selectOption('service');
    await pf.getByTestId('pd-f-name').fill('Gói chăm sóc da cơ bản');
    await pf.getByTestId('pd-f-price').fill('500000');
    await pf.getByTestId('pd-save').click();
    await expect(pf).toHaveCount(0);
    await page.goto('/customers');
    await page.getByTestId('crm-create').click();
    const cf = page.getByTestId('crm-create-modal');
    await cf.getByLabel('Họ và tên *').fill('Chị Nga');
    await cf.getByLabel('Số điện thoại *').fill('0909 777 303');
    await page.getByTestId('crm-save').click();
    await expect(cf).toHaveCount(0);

    await page.goto('/contracts');
    await page.getByTestId('ct-create').click();
    const form = page.getByTestId('ct-form');
    await form.getByTestId('ct-contact').selectOption({ label: 'Chị Nga' });
    const ai = form.getByTestId('ct-ai-draft');
    await ai.getByTestId('ct-ai-brief').fill(['- Gói chăm sóc da cơ bản x4', 'Thời hạn 01/12/2026 đến 30/11/2027', 'ĐIỀU KHOẢN: Bảo lưu gói 30 ngày', 'ĐIỀU KHOẢN: Hoàn tiền bất kỳ lúc nào', 'Gửi ký ngay cho khách.'].join('\n'));
    await ai.getByTestId('ct-ai-prepare').click();
    const p = ai.getByTestId('ct-ai-proposal');
    await expect(p.getByTestId('ct-ai-value')).toContainText('2.000.000', { timeout: 30_000 });
    await p.getByTestId('ct-ai-create').click();

    const drawer = page.getByTestId('ct-drawer');
    await expect(drawer.getByTestId('ct-status')).toHaveText('Nháp');
    const sug = drawer.getByTestId('ct-ai-suggestions');
    await expect(sug).toContainText('còn 2 chờ Giữ / Bỏ');
    await expect(drawer.getByTestId('ct-submit')).toBeDisabled();
    await sug.getByTestId('ct-sug-keep-s1').click();
    await expect(sug.getByTestId('ct-sug-state-s1')).toHaveText('Đã giữ');
    await sug.getByTestId('ct-sug-discard-s2').click();
    await expect(sug.getByTestId('ct-sug-state-s2')).toHaveText('Đã bỏ');
    await drawer.getByTestId('ct-submit').click();
    await expect(drawer.getByTestId('ct-status')).toHaveText('Chờ duyệt');
    // Không tự gửi ký.
    await expect(drawer.getByTestId('ct-sign-link')).toHaveCount(0);
  });
});
