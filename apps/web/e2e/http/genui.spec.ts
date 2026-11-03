// TIP-023c G1 AC4 — E2E chế độ http (pnpm e2e:http): GenUI trên backend thật (model giả `AI_ENGINE=mock`, hộp thư giả). "kết nối email …"
// → Trợ lý render form `channel.email.connect` (ô mật khẩu trống, dạng password) → nhập mật khẩu → Kết nối → thẻ xem trước (intent: nguồn
// assistant) → Xác nhận (vault, không gửi lại mật khẩu) → kênh mới ở Cài đặt. Mật khẩu không còn trong DOM sau khi gửi.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const PASSWORD = 'app-password-e2e';

test.describe('GenUI (http)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await spoofIp(page);
  });

  test('form email qua Trợ lý: ô bí mật → xem trước → xác nhận → kênh mới', async ({ page }) => {
    await onboarded(page, 'genui');
    await page.goto('/assistant');
    await page.getByRole('radio', { name: 'Cowork' }).click();
    const box = `genui-${Date.now()}@spa-e2e.vn`;
    await page.getByTestId('asst-composer').locator('textarea').fill(`kết nối email ${box}`);
    await page.getByTestId('asst-send').click();

    const form = page.getByTestId('genui-form');
    await expect(form).toBeVisible({ timeout: 20_000 });
    await expect(form.locator('[data-field="address"]')).toHaveValue(box);
    const secret = form.getByTestId('genui-secret');
    await expect(secret).toHaveAttribute('type', 'password');
    await expect(secret).toHaveValue('');
    await form.locator('[data-field="fields.imap_host"]').fill('imap.fake.test');
    await secret.fill(PASSWORD);
    await form.getByTestId('genui-form-submit').click();

    const preview = page.getByRole('dialog', { name: 'Xác nhận thao tác' });
    await expect(preview).toBeVisible({ timeout: 20_000 });
    await preview.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    await expect(preview).toBeHidden({ timeout: 20_000 });
    await expect(secret).toHaveValue('');
    expect(await page.content()).not.toContain(PASSWORD);

    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-f-on').click();
    await expect(page.locator('[data-channel="email"]')).toContainText('Đã kết nối');
  });
});
