// TIP-003e — E2E chế độ http (backend thật): AC2 — mở hộp "Đóng ticket", một ghi khác chen vào qua API (ticket.set_status) → lưu nhận 409
// STALE_VERSION thật từ server → hộp xung đột chung; "Giữ bản của tôi" không ghi đè (lý do còn nguyên), "Tải lại" lấy version mới rồi đóng
// được. AC6 — hành động gửi ra ngoài (member.invite, risk send; gói Team qua webhook ngân hàng giả như contact-transfer) → Nhật ký không
// Hoàn tác, có "Ghi đính chính"; ghi xong hiện đính chính.
import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { freshEmail, onboarded, spoofIp } from './support';

const API = process.env.API_URL ?? 'http://localhost:4117';
const KEY = process.env.MOCK_BANK_FEED_KEY ?? 'mock-bank-feed-dev';
const ACCOUNT = process.env.PLATFORM_BANK_ACCOUNT_NO ?? '0071000888999';
type Headers = Record<string, string>;
async function auth(req: APIRequestContext): Promise<Headers> {
  const token = ((await (await req.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await req.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act(req: APIRequestContext, h: Headers, id: string, input: unknown) {
  const r = await req.post(`/api/v1/actions/${id}`, { headers: { ...h, 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  return { status: r.status(), body: (await r.json()) as { data: { result: Record<string, string> } } };
}

async function bankPays(amount: string, content: string) {
  const body = JSON.stringify({ id: `e2e-${Date.now()}`, transactions: [{ external_id: `e2e-${Date.now()}-${Math.random()}`, account_number: ACCOUNT, amount, direction: 'in', content, occurred_at: new Date().toISOString() }] });
  const r = await fetch(`${API}/hooks/payments/mock`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-mock-signature': createHmac('sha256', KEY).update(body).digest('hex') }, body });
  expect(r.status).toBe(200);
}

test.describe('đồng thời (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('AC2: 409 STALE_VERSION thật → hộp xung đột, giữ lý do, Tải lại rồi đóng', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'stale');
    const h = await auth(page.request);
    const t = await act(page.request, h, 'ticket.create', { title: 'Xung đột phiên bản', channel: 'email', category: 'Billing', priority: 'medium' });
    expect(t.status).toBe(200);
    await page.goto('/tickets');
    await page.locator(`[data-ticket="${t.body.data.result.ticket_id}"]`).click();
    const d = page.getByTestId('tk-drawer');
    await d.getByTestId('tk-close').click();
    const box = page.getByTestId('tk-close-box');
    await box.getByTestId('tk-close-reason').selectOption('withdrawn');
    expect((await act(page.request, h, 'ticket.set_status', { ticket_id: t.body.data.result.ticket_id, status: 'in_progress' })).status).toBe(200);
    await box.getByTestId('tk-close-ok').click();
    const stale = page.getByRole('dialog', { name: 'Bản ghi vừa được người khác cập nhật' });
    await expect(stale).toBeVisible();
    await stale.getByTestId('stale-keep').click();
    await expect(box.getByTestId('tk-close-reason')).toHaveValue('withdrawn');
    await box.getByTestId('tk-close-ok').click();
    await stale.getByTestId('stale-reload').click();
    await expect(stale).toBeHidden();
    await expect(box.getByTestId('tk-close-reason')).toHaveValue('withdrawn');
    await box.getByTestId('tk-close-ok').click();
    await expect(box).toHaveCount(0);
    await expect(d.getByTestId('tk-status')).toHaveText('Đã đóng');
  });

  test('AC6: hành động đã gửi → Ghi đính chính (không Hoàn tác); đính chính hiện trong nhật ký', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'correct');
    const h = await auth(page.request);
    const inv = await act(page.request, h, 'billing.create_invoice', { kind: 'plan', item: 'team', period: 'month' });
    expect(inv.status, JSON.stringify(inv.body)).toBe(200);
    await bankPays(inv.body.data.result.amount!, `MBVCB ${inv.body.data.result.transfer_code} chuyen khoan`);
    await expect.poll(async () => (await act(page.request, h, 'member.invite', { email: freshEmail('corr'), name: 'Sales Mới', role: 'sales' })).status, { timeout: 20_000 }).toBe(200);
    await page.goto('/assistant/actions');
    await page.getByRole('tab', { name: 'Gửi đi' }).click();
    const row = page.locator('[data-log]').first();
    await expect(row.getByTestId('log-undo')).toHaveCount(0);
    await row.getByTestId('log-correct-open').click();
    const modal = page.getByTestId('log-correct');
    await modal.getByTestId('log-correct-note').fill('Gửi nhầm vai trò — đúng là CSKH');
    await modal.getByTestId('log-correct-save').click();
    await expect(modal).toHaveCount(0);
    await expect(row.getByTestId('log-correction')).toHaveText('Đính chính: Gửi nhầm vai trò — đúng là CSKH');
  });
});
