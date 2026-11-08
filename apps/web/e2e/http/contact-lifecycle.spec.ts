// TIP-015f P6 (http — pnpm e2e:http): vòng đời khách trên backend thật. Khách nhắn qua widget web (tạo khách + hội thoại) → Hộp thư mở sẵn →
// xoá khách (action thật) → KHÔNG tải lại, panel 360° đổi sang dấu "khách đã xoá" (WS `contact.lifecycle` làm mới danh sách + hội thoại) →
// khách nhắn tiếp: tin vẫn vào đúng hội thoại, vẫn giữ dấu (danh tính khách đã xoá giữ gắn, không tạo khách mới) → thùng rác ở màn Khách
// hàng có khách → khôi phục (xác nhận) → khách trở lại bảng, Hộp thư hiện lại Hồ sơ 360°.
import { expect, test, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-lifecycle.e2e.test';
type Headers = Record<string, string>;

async function auth(req: APIRequestContext): Promise<Headers> {
  const token = ((await (await req.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await req.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act(req: APIRequestContext, h: Headers, id: string, input: unknown) {
  const r = await req.post(`/api/v1/actions/${id}`, { headers: { ...h, 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  return { status: r.status(), body: (await r.json()) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

test.describe('vòng đời khách (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('xoá khách → Hộp thư đổi dấu không tải lại, tin vẫn vào; khôi phục từ thùng rác → 360° trở lại', async ({ page, browser }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'lifecycle');
    const h = await auth(page.request);
    await page.goto('/settings/web_widget');
    await page.getByTestId('st-wg-enabled').click();
    await expect(page.getByTestId('st-wg-embed')).toContainText('data-key="wk_', { timeout: 15_000 });
    const code = (await page.getByTestId('st-wg-embed').textContent())!;

    await page.goto('/inbox');
    await expect(page.getByTestId('inbox')).toBeVisible();
    const visitor = await browser.newContext();
    const w = (await openWidget(visitor, code)).locator('appchat-widget');
    await w.getByTestId('wg-input').fill('Cho mình hỏi lịch chiều nay');
    await w.getByTestId('wg-input').press('Enter');
    const row = page.getByTestId('conv-row').filter({ hasText: 'Chị Vòng Đời' });
    await expect(row).toHaveCount(1, { timeout: 10_000 });
    await row.locator('button').first().click();
    await expect(page.getByTestId('panel-360')).toBeVisible();

    const list = (await (await page.request.get('/api/v1/conversations', { headers: h })).json()) as { data: { id: string; contact_id: string | null }[] };
    const contactId = list.data.find((c) => c.contact_id)!.contact_id!;

    const del = await act(page.request, h, 'contact.delete', { contact_id: contactId });
    expect(del.status, JSON.stringify(del.body)).toBe(200);
    expect(del.body.data.result.status).toBe('deleted');
    // WS contact.lifecycle → hội thoại làm mới: dấu khách đã xoá thay 360°, không tải lại.
    await expect(page.getByTestId('panel-deleted-contact')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('panel-360')).toHaveCount(0);

    await w.getByTestId('wg-input').fill('Mình vẫn muốn đặt lịch');
    await w.getByTestId('wg-input').press('Enter');
    await expect(page.getByTestId('thread').getByTestId('msg-in').last()).toContainText('Mình vẫn muốn đặt lịch', { timeout: 10_000 });
    await expect(page.getByTestId('panel-deleted-contact')).toBeVisible();
    const after = (await (await page.request.get('/api/v1/conversations', { headers: h })).json()) as { data: { contact_id: string | null; contact_deleted?: boolean }[] };
    expect(after.data.filter((c) => c.contact_id === contactId).every((c) => c.contact_deleted)).toBe(true);

    // Thùng rác ở màn Khách hàng → khôi phục (xác nhận) → khách trở lại bảng.
    await page.goto('/customers');
    await expect(page.locator(`[data-contact="${contactId}"]`)).toHaveCount(0);
    await page.getByTestId('crm-trash-open').click();
    await expect(page.getByTestId(`crm-trash-row-${contactId}`)).toContainText('Chị Vòng Đời');
    await page.getByTestId(`crm-trash-restore-${contactId}`).click();
    await page.locator('.ant-modal-confirm').getByRole('button', { name: 'Khôi phục' }).click();
    await expect(page.getByTestId(`crm-trash-row-${contactId}`)).toHaveCount(0);
    await page.getByTestId('crm-trash').getByRole('button', { name: 'Đóng' }).click();
    await expect(page.locator(`[data-contact="${contactId}"]`)).toHaveCount(1);

    await page.goto('/inbox');
    await page.getByTestId('conv-row').filter({ hasText: 'Chị Vòng Đời' }).locator('button').first().click();
    await expect(page.getByTestId('panel-360')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('panel-deleted-contact')).toHaveCount(0);
    await visitor.close();
  });
});

async function openWidget(context: BrowserContext, code: string): Promise<Page> {
  const key = /data-key="([^"]+)"/.exec(code)![1]!;
  const api = /data-api="([^"]+)"/.exec(code)![1]!;
  await context.grantPermissions(['local-network-access']);
  const shop = await context.newPage();
  await shop.route(`${SHOP}/**`, (r) =>
    r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="vi"><body><h1>Spa</h1><script src="${api}/widget.js" async data-key="${key}" data-api="${api}"></script></body></html>` }),
  );
  await shop.goto(`${SHOP}/`);
  const w = shop.locator('appchat-widget');
  await w.getByTestId('wg-launcher').click();
  await expect(w.getByTestId('wg-prechat')).toBeVisible({ timeout: 15_000 });
  await w.getByTestId('wg-pre-name').fill('Chị Vòng Đời');
  await w.getByTestId('wg-pre-phone').fill('0907222888');
  await w.getByTestId('wg-pre-start').click();
  return shop;
}
