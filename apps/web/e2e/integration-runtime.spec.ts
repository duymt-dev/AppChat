// TIP-012b P3 (AC7, AC8) — E2E mock: thẻ kết nối ngân hàng đã kết nối mở drawer chi tiết — sức khoẻ từ bằng chứng (SePay chỉ webhook:
// "đã cấu hình, chưa xác minh", không nút đồng bộ); Casso có kéo: "Đồng bộ ngay" → "đang đồng bộ" (accepted ≠ xong) → xong, nhật ký có
// lượt kéo; "Quản lý kết nối" mở hộp kết nối. Mobile 390: drawer không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const go = '/settings/integrations?session=authed,declared,trialSeen';

test.describe('runtime kết nối', () => {
  test('SePay chỉ webhook: chưa xác minh, không đồng bộ; Quản lý mở hộp kết nối', async ({ page }) => {
    await page.goto(go);
    await page.locator('[data-connector="sepay"]').click();
    const d = page.getByTestId('st-int-drawer');
    await expect(d.getByTestId('st-int-health')).toHaveAttribute('data-health', 'configured_unverified');
    await expect(d.getByTestId('st-int-sync')).toHaveCount(0);
    await expect(d.getByTestId('st-int-evidence')).toContainText('••3456');
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    await d.getByTestId('st-int-manage').click();
    await expect(page.getByTestId('st-int-modal')).toBeVisible();
  });

  test('Casso có kéo: kết nối → drawer → Đồng bộ ngay → đang đồng bộ → xong, nhật ký có lượt kéo', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go);
    await page.locator('[data-connector="casso"]').click();
    const m = page.getByTestId('st-int-modal');
    await m.getByTestId('st-int-f-webhook_secret').fill('ck_e2e');
    await m.getByTestId('st-int-f-account_number').fill('8007041027107');
    await m.getByTestId('st-int-f-api_key').fill('ak_e2e');
    await m.getByTestId('st-int-save').click();
    await expect(m).toHaveCount(0);
    await page.locator('[data-connector="casso"]').click();
    const d = page.getByTestId('st-int-drawer');
    await expect(d.getByTestId('st-int-health')).toHaveAttribute('data-health', 'verified');
    await d.getByTestId('st-int-sync').click();
    await expect(d.getByTestId('st-int-pending')).toBeVisible();
    await expect(d.getByTestId('st-int-sync')).toBeDisabled();
    await expect(d.getByTestId('st-int-pending')).toHaveCount(0, { timeout: 10_000 });
    await expect(d.locator('[data-testid="st-int-call"][data-status="succeeded"]')).toHaveCount(2);
    await expect(d).not.toContainText('ak_e2e');
  });
});
