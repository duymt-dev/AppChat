// TIP-015g AC8 (http — pnpm e2e:http): kéo thẻ Kanban Khách hàng (action contact.set_stage thật) → hoàn tất đơn trong 24 giờ giữ →
// đơn completed nhưng thẻ vẫn ở cột đã kéo (tải lại giữ nguyên); kéo cùng cột không tạo lịch sử giai đoạn mới; hoàn tác lần kéo
// sau khi đã kéo tiếp → 409 (không đè). Không có điều khiển UI mới.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

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

test.describe('giữ giai đoạn kéo tay 24 giờ (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('kéo thẻ → hoàn tất đơn trong 24 giờ không kéo thẻ sang Đã mua; kéo cùng cột không đổi; hoàn tác sau khi kéo tiếp → 409', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'stagehold');
    const h = await auth(page.request);
    const c = await act(page.request, h, 'contact.create', { full_name: 'Chị Giữ Giai Đoạn', phone: '0909515001', email: 'giu-giai-doan@example.com' });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    const contactId = c.body.data.result.contact_id as string;

    await page.goto('/customers');
    await page.getByRole('radio', { name: 'Kanban' }).click();
    const board = page.getByTestId('crm-kanban');
    const card = board.locator(`[data-testid="kanban-card"][data-contact="${contactId}"]`);
    await expect(board.locator('[data-column="lead"]')).toContainText('Chị Giữ Giai Đoạn');
    await card.dragTo(board.locator('[data-column="potential"]'));
    await expect(board.locator('[data-column="potential"]')).toContainText('Chị Giữ Giai Đoạn');

    const logs = async () => ((await (await page.request.get(`/api/v1/contacts/${contactId}/timeline`, { headers: h })).json()) as { data: unknown[] }).data.length;
    const before = await logs();
    // Kéo cùng cột (lệnh trực tiếp) = no-op: không lịch sử mới.
    expect((await act(page.request, h, 'contact.set_stage', { contact_id: contactId, stage: 'potential' })).status).toBe(200);
    expect(await logs()).toBe(before);

    // Producer Commerce thật trong 24 giờ: hoàn tất đơn (đơn vẫn completed, giai đoạn không bị nâng lên Đã mua).
    const o = await act(page.request, h, 'order.create', { contact_id: contactId, items: [{ name: 'Gói chăm sóc', qty: 1, unit_price: '900000', tax_rate: 0 }] });
    expect(o.status, JSON.stringify(o.body)).toBe(200);
    const order = o.body.data.result.order_id as string;
    expect((await act(page.request, h, 'order.confirm', { order_id: order })).status).toBe(200);
    expect((await act(page.request, h, 'order.complete', { order_id: order })).status).toBe(200);

    await page.reload();
    await page.getByRole('radio', { name: 'Kanban' }).click();
    await expect(page.getByTestId('crm-kanban').locator('[data-column="potential"]')).toContainText('Chị Giữ Giai Đoạn');
    await expect(page.getByTestId('crm-kanban').locator('[data-column="won"]')).not.toContainText('Chị Giữ Giai Đoạn');

    // Lần kéo đầu không hoàn tác được sau khi đã kéo tiếp (không đè lựa chọn mới).
    const first = await act(page.request, h, 'contact.set_stage', { contact_id: contactId, stage: 'consulting' });
    const second = await act(page.request, h, 'contact.set_stage', { contact_id: contactId, stage: 'contract' });
    expect(second.status).toBe(200);
    const u = await page.request.post(`/api/v1/action-logs/${first.body.data.action_log_id}/undo`, { headers: h, data: {} });
    expect(u.status()).toBe(409);
  });
});
