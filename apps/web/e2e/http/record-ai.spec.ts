// TIP-023g AC1/AC4 — E2E chế độ http (pnpm e2e:http): Trợ lý theo bản ghi trên backend thật (AI_ENGINE=mock, server đọc lại bản ghi
// theo quyền). (1) Ticket: ✦ trên dòng → drawer Trợ lý gắn đúng ticket → gửi việc → lượt mang `record_intent`, server trả lời (không
// 404/422). (2) Sản phẩm: tab AI → Gợi ý combo → binding `record_proposal` validated, món + giá danh mục; Gợi ý chiến dịch → nội dung;
// không tạo sản phẩm / chiến dịch. (3) id bản ghi không thấy → 404 (cùng envelope), cặp lạ → 422.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act<T>(page: Page, id: string, input: unknown): Promise<T> {
  const r = await page.request.post(`/api/v1/actions/${id}`, { headers: { ...(await auth(page)), 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  expect(r.status(), await r.text()).toBe(200);
  return ((await r.json()) as { data: { result: T } }).data.result;
}

test.describe('Trợ lý theo bản ghi (http)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await spoofIp(page);
  });

  test('ticket ✦ → drawer gắn đúng ticket, lượt theo bản ghi; sản phẩm → combo / chiến dịch validated; 404 / 422', async ({ page }) => {
    test.setTimeout(150_000);
    await onboarded(page, 'record-ai');
    const tk = await act<{ ticket_id: string }>(page, 'ticket.create', { title: 'Khách hỏi bảo hành', channel: 'email', category: 'Khác', priority: 'high' });
    const p1 = await act<{ product_id: string }>(page, 'product.create', { name: 'Gội đầu dưỡng sinh', type: 'service', price: '200000', status: 'active' });
    await act(page, 'product.create', { name: 'Dầu gội thảo mộc', type: 'physical', price: '150000', status: 'active' });

    // (1) Ticket.
    const turns: unknown[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/assistant/messages')) turns.push(r.postDataJSON());
    });
    await page.goto('/tickets');
    await page.locator(`[data-ticket="${tk.ticket_id}"]`).first().getByRole('button', { name: 'Xem gợi ý AI' }).click();
    const panel = page.getByTestId('tk-rai');
    await expect(panel).toHaveAttribute('data-record', tk.ticket_id);
    expect(turns).toHaveLength(0);
    await panel.getByTestId('tk-rai-task').fill('Tóm tắt ticket này');
    await panel.getByTestId('tk-rai-submit').click();
    await expect(panel.getByTestId('screen-ai-msg').first()).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByTestId('screen-ai-msg').first()).not.toHaveCSS('color', 'rgb(220, 38, 38)');
    expect(turns.at(-1)).toMatchObject({ record_intent: { entity: 'ticket', entity_id: tk.ticket_id, intent: 'inspect' } });

    // (2) Sản phẩm.
    await page.goto('/products');
    await page.locator(`[data-product="${p1.product_id}"]`).click();
    const drawer = page.getByTestId('pd-drawer');
    await drawer.getByRole('tab', { name: 'AI' }).click();
    const pd = drawer.getByTestId('pd-rai');
    await pd.getByTestId('pd-rai-intent-product_combo').click();
    await pd.getByTestId('pd-rai-submit').click();
    const card = pd.getByTestId('rai-proposal');
    await expect(card).toHaveAttribute('data-state', 'validated', { timeout: 30_000 });
    await expect(card.getByTestId('rai-combo-items')).toContainText('Gội đầu dưỡng sinh');
    await pd.getByTestId('pd-rai-intent-product_campaign').click();
    await pd.getByTestId('pd-rai-submit').click();
    await expect(pd.getByTestId('rai-proposal')).toHaveAttribute('data-state', 'validated', { timeout: 30_000 });
    await expect(page.locator('[data-product]')).toHaveCount(2);

    // (3) Hợp đồng lỗi.
    const h = await auth(page);
    const post = (data: unknown) => page.request.post('/api/v1/assistant/record-proposals', { headers: h, data });
    const missing = await post({ entity: 'product', entity_id: '0190f000-0000-7000-8000-00000000ffff', intent: 'product_combo', request_id: crypto.randomUUID() });
    expect(missing.status()).toBe(404);
    const pair = await post({ entity: 'quote', entity_id: p1.product_id, intent: 'product_combo', request_id: crypto.randomUUID() });
    expect(pair.status()).toBe(422);
  });
});
