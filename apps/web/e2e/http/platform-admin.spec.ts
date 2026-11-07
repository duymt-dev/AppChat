// TIP-040 pha 5 — E2E chế độ http (pnpm e2e:http platform-admin): màn Quản trị nền tảng /admin trên backend thật.
//   - Owner workspace (không phải admin nền tảng) gõ thẳng /admin → "không có quyền" (403 từ /admin/session), không thấy dữ liệu.
//   - Admin nền tảng (cấp qua script shell `db:grant-platform-admin --test` — không có đường UI / API tự cấp) tạm dừng workspace của
//     owner kèm lý do → API của workspace đó trả 423; mở lại → chạy lại. Tab deep-link `?tab=`, đọc cấu hình (không ghi cấu hình nền
//     tảng dùng chung của DB test — CAS / ghi cấu hình kiểm ở integration platform-config / providers).
//   - Mobile 390: màn dùng được, không cuộn ngang trang.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const ROOT = join(import.meta.dirname, '..', '..', '..', '..');

function grantAdmin(email: string) {
  const r = spawnSync('pnpm', ['--filter', '@appchat/db', 'db:grant-platform-admin', email, '--test'], { cwd: ROOT, shell: true, encoding: 'utf8' });
  expect(r.status, r.stderr).toBe(0);
}

async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}

test.describe('quản trị nền tảng (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('owner không phải admin → không có quyền; admin tạm dừng → 423 → mở lại', async ({ page, browser }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'adm-owner');
    const h = await auth(page);
    const ws = h['x-workspace-id'];
    await page.goto('/admin');
    await expect(page.getByTestId('adm-denied')).toBeVisible();
    await expect(page.getByTestId('adm-screen')).toHaveCount(0);

    const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL, locale: 'vi-VN', viewport: { width: 1440, height: 900 } });
    const admin = await ctx.newPage();
    await spoofIp(admin);
    grantAdmin(await onboarded(admin, 'adm-admin'));
    await admin.goto('/admin');
    await expect(admin.getByTestId('adm-screen')).toBeVisible();

    await admin.getByTestId(`adm-ws-suspend-${ws}`).click();
    await expect(admin.getByTestId('adm-ws-suspend-ok')).toBeDisabled();
    await admin.getByTestId('adm-ws-reason').fill('Nợ phí quá hạn');
    await admin.getByTestId('adm-ws-suspend-ok').click();
    await expect(admin.getByTestId(`adm-ws-resume-${ws}`)).toBeVisible();
    await expect.poll(async () => (await page.request.get('/api/v1/contacts', { headers: h })).status(), { timeout: 10_000 }).toBe(423);

    await admin.getByTestId(`adm-ws-resume-${ws}`).click();
    await expect(admin.getByTestId(`adm-ws-suspend-${ws}`)).toBeVisible();
    await expect.poll(async () => (await page.request.get('/api/v1/contacts', { headers: h })).status(), { timeout: 10_000 }).toBe(200);

    // Tab deep-link: đổi tab ghi ?tab=, mở thẳng URL vào đúng tab.
    await admin.getByTestId('adm-tab-plans').click();
    await expect(admin).toHaveURL(/\/admin\?tab=plans/);
    await expect(admin.getByTestId('adm-plans-table')).toBeVisible();
    await admin.goto('/admin?tab=providers');
    await expect(admin.getByTestId('adm-prov-table')).toBeVisible();
    await ctx.close();
  });

  test('mobile 390: màn quản trị dùng được, không cuộn ngang', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    grantAdmin(await onboarded(page, 'adm-mob'));
    await page.goto('/admin');
    await expect(page.getByTestId('adm-screen')).toBeVisible();
    await expect(page.getByTestId('adm-ws-table')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    // 390px: antd gom tab tràn vào menu "…" — chọn tab qua menu đó như người dùng.
    await page.locator('.ant-tabs-nav-more').click();
    await page.getByRole('option', { name: 'Định tuyến model' }).click();
    await expect(page).toHaveURL(/tab=routes/);
    await expect(page.getByTestId('adm-route-standard-chat')).toBeVisible();
  });
});
