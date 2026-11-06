// TIP-042b (http — pnpm e2e:http): chia lead mới trên backend thật. Chủ sở hữu mở Cài đặt › Chia lead (GET /settings/lead-routing): rule
// mặc định chưa có (thủ công · hàng chung) → bật xoay vòng với chính mình (gói dùng thử 1 người dùng) → tải lại đọc từ DB → kết nối Zalo
// (worker kênh giả) → drawer khối Phân công hiện "Theo mặc định · Xoay vòng" và không còn ô "Cách chia" cũ → ghi đè tài khoản ở chế độ
// thủ công → drawer "Thủ công · hàng chung"; Chia lead hiện tài khoản ở trạng thái thủ công. Chia lead thật (worker) kiểm ở integration.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('chia lead (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('bật xoay vòng mặc định → tài khoản kênh theo mặc định → ghi đè thủ công', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'routing');

    await page.goto('/settings/routing');
    const def = page.locator('[data-rule="default"]');
    await expect(def.getByTestId('st-rt-status')).toHaveText('Thủ công · hàng chung');
    await def.getByTestId('st-rt-edit').click();
    const ed = page.getByTestId('st-rt-editor');
    await ed.getByTestId('st-rt-enabled').click();
    await ed.getByTestId('st-rt-mode').selectOption('round_robin');
    await ed.locator('input[data-user]').first().check();
    await ed.getByTestId('st-rt-editor-save').click();
    await expect(ed).toHaveCount(0);
    await page.reload();
    await expect(def.getByTestId('st-rt-status')).toHaveText('Xoay vòng (chia đều)');

    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-zalo_personal').click();
    const w = page.getByTestId('st-ch-wizard');
    await w.getByTestId('st-ch-wizard-label').fill('Zalo chia lead');
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w.getByTestId('st-ch-wizard-cfg-name')).toBeVisible({ timeout: 30_000 });
    await expect(w.getByTestId('st-ch-wizard-cfg-assign')).toHaveCount(0);
    await expect(w.getByTestId('st-ch-wizard-routing')).toBeVisible();
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);

    await page.getByTestId('st-ch-zalo_personal').click();
    const d = page.getByTestId('st-ch-drawer');
    await d.getByTestId(/^st-ch-drawer-acct-/).first().click();
    await expect(d.getByTestId('st-ch-drawer-routing-status')).toHaveText('Theo mặc định · Xoay vòng (chia đều)');
    await expect(d.getByTestId('st-ch-drawer-assign')).toHaveCount(0);
    await d.getByTestId('st-ch-drawer-routing-open').click();

    await expect(page).toHaveURL(/\/settings\/routing/);
    const acc = page.locator('[data-rule]:not([data-rule="default"])').first();
    await expect(acc.getByTestId('st-rt-status')).toHaveText('Theo mặc định');
    await acc.getByTestId('st-rt-edit').click();
    await ed.getByTestId('st-rt-mode').selectOption('manual');
    await ed.getByTestId('st-rt-editor-save').click();
    await expect(ed).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-rule]:not([data-rule="default"])').first().getByTestId('st-rt-status')).toHaveText('Thủ công · hàng chung');
  });
});
