// TIP-012c P5 (AC7) — E2E mock: thẻ Brevo ở Nền tảng kết nối mở Cài đặt › Email Marketing (prototype L7033) — người gửi đã xác minh,
// SMTP tách "đăng nhập + TLS" / chưa xác nhận người gửi (không chọn được); wizard Email chọn người gửi mail của DN tường minh → chiến dịch
// hiện người gửi đã chốt. Mobile 390: mục Email Marketing không tràn ngang, vùng chạm nhà cung cấp ≥ 44px.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';

test.describe('mail của doanh nghiệp', () => {
  test('Brevo mở Email Marketing: người gửi đã xác minh; SMTP kết nối → chưa xác nhận người gửi', async ({ page }) => {
    await page.goto(`/settings/integrations${S}`);
    await page.locator('[data-connector="brevo"]').click();
    await expect(page).toHaveURL(/\/settings\/email_mkt/);
    const card = page.getByTestId('st-em-card');
    await expect(card).toHaveAttribute('data-connector', 'brevo');
    await expect(page.getByTestId('st-em-sender')).toHaveAttribute('data-usable', 'true');
    await expect(page.getByTestId('st-em-senders')).toContainText('news@annhienspa.vn');
    if (isMobile(page)) {
      await expectNoHorizontalOverflow(page);
      expect((await page.getByTestId('st-em-plat-smtp').boundingBox())!.height).toBeGreaterThanOrEqual(44);
      return;
    }
    await page.getByTestId('st-em-plat-smtp').click();
    await page.getByTestId('st-em-connect').click();
    const m = page.getByTestId('st-int-modal');
    await m.getByTestId('st-int-f-host').fill('smtp.annhienspa.vn');
    await m.getByTestId('st-int-f-username').fill('hello@annhienspa.vn');
    await m.getByTestId('st-int-f-password').fill('app-pass-e2e');
    await m.getByTestId('st-int-save').click();
    await expect(m).toHaveCount(0);
    const smtp = page.getByTestId('st-em-sender');
    await expect(smtp).toHaveAttribute('data-usable', 'false');
    await expect(smtp).toContainText('Đăng nhập SMTP + TLS');
    await expect(smtp).toContainText('Chưa xác nhận người gửi');
  });

  test('wizard Email chọn người gửi mail của DN → chiến dịch hiện người gửi đã chốt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/marketing${S}`);
    await page.getByTestId('mk-create').click();
    const w = page.getByTestId('mk-wizard');
    await w.getByTestId('mk-wiz-ch-email').click();
    await w.getByTestId('mk-wiz-next').click();
    await w.locator('[data-cust]').first().click();
    await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-name').fill('Bản tin qua Brevo');
    await w.getByTestId('mk-wiz-subject').fill('Ưu đãi tháng 11');
    await w.getByTestId('mk-wiz-body').fill('Chào {ten}');
    await w.getByTestId('mk-wiz-next').click();
    const pick = w.getByTestId('mk-wiz-sender');
    await expect(pick.locator('option', { hasText: 'news@annhienspa.vn' })).toHaveCount(1);
    await pick.selectOption({ label: 'An Nhiên Spa · news@annhienspa.vn (Brevo)' });
    await expect(w).toContainText('Người gửi chốt cùng bản duyệt');
    await w.getByTestId('mk-wiz-draft').click();
    await expect(w).toHaveCount(0);
    await page.locator('[data-campaign]').filter({ hasText: 'Bản tin qua Brevo' }).first().click();
    await page.getByTestId('mk-detail').getByTestId('mk-dtab-content').click();
    await expect(page.getByTestId('mk-content')).toContainText('news@annhienspa.vn');
  });
});
