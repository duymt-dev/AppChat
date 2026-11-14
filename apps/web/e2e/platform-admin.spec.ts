// TIP-040 pha 5 — E2E chế độ mock: màn Quản trị nền tảng /admin (không có prototype — PD-022, không so pixel). Tab deep-link, tạm
// dừng / mở lại workspace (lý do bắt buộc), sửa gói qua form (CAS phiên bản), bật / tắt provider; mobile 390 không cuộn ngang. Phân quyền
// 403 + chặn thật (423) kiểm ở e2e/http/platform-admin.spec.ts.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const WS = '0190f000-0000-7000-8000-00000000a001';
const S = '?session=authed,declared,trialSeen';

test.describe('quản trị nền tảng (mock)', () => {
  test('workspace: tạm dừng cần lý do → mở lại; gói: sửa giá; provider: tắt / bật', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/admin${S}`);
    await expect(page.getByTestId('adm-screen')).toBeVisible();
    await page.getByTestId(`adm-ws-suspend-${WS}`).click();
    await expect(page.getByTestId('adm-ws-suspend-ok')).toBeDisabled();
    await page.getByTestId('adm-ws-reason').fill('Nợ phí');
    await page.getByTestId('adm-ws-suspend-ok').click();
    await page.getByTestId(`adm-ws-resume-${WS}`).click();
    await expect(page.getByTestId(`adm-ws-suspend-${WS}`)).toBeVisible();

    await page.getByTestId('adm-tab-plans').click();
    await expect(page).toHaveURL(/tab=plans/);
    await page.getByTestId('adm-plan-team').click();
    await expect(page.getByTestId('adm-plan-key')).toBeDisabled();
    await page.getByTestId('adm-plan-price').fill('1090000');
    await page.getByTestId('adm-plan-save').click();
    await expect(page.getByTestId('adm-plan-team')).toContainText('1.090.000');

    await page.goto(`/admin${S}&tab=providers`);
    await page.getByTestId('adm-prov-toggle-router').click();
    await expect(page.getByTestId('adm-prov-toggle-router')).toHaveText(/Bật/);
    await page.getByTestId('adm-prov-toggle-router').click();
    await expect(page.getByTestId('adm-prov-toggle-router')).toHaveText(/Tắt/);
  });

  test('mobile 390: không cuộn ngang, tab tràn chọn qua menu', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(`/admin${S}`);
    await expect(page.getByTestId('adm-ws-table')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('.ant-tabs-nav-more').click();
    await page.getByRole('option', { name: 'Đơn giá model' }).click();
    await expect(page).toHaveURL(/tab=prices/);
  });
});
