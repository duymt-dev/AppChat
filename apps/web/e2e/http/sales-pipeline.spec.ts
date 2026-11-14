// TIP-026c (http — pnpm e2e:http sales-pipeline): backend thật. Tạo khách + cơ hội (Đủ điều kiện, 30tr) → Hồ sơ 360° ở Khách hàng hiện thẻ
// 25% + cột "Cơ hội đang mở"; báo giá gắn cơ hội gửi → Báo giá 70% (giá trị = tổng báo giá); khách chốt → Đàm phán; drawer: Đánh dấu Thua
// (lý do bắt buộc) → Thua; Mở lại → Đủ điều kiện. Đã mua thiếu chứng từ → 422 won_needs_document; probability → 422 field_removed.
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
async function opp(req: APIRequestContext, h: Headers, id: string) {
  return ((await (await req.get(`/api/v1/opportunities/${id}`, { headers: h })).json()) as { data: { stage: string; amount_vnd: string; version: number } }).data;
}

test.describe('Cơ hội / Sales Pipeline (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('thẻ 360° + cột → báo giá gửi / chốt kéo cơ hội → Thua / Mở lại ở drawer', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'pipeline');
    const h = await auth(page.request);
    // Kênh Email giả (TIP-018) để quote.send có đường gửi thật (mở chuỗi thư mới cho khách có email).
    const mail = await act(page.request, h, 'channel.email.connect', { address: `pl-${Date.now()}@spa-e2e.vn`, fields: { imap_host: 'imap.fake.test', password: 'app-password-e2e' } });
    expect(mail.status, JSON.stringify(mail.body)).toBe(200);
    const c = await act(page.request, h, 'contact.create', { full_name: 'Chị Pipeline', phone: '0909626001', email: 'pipeline@example.com' });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    const contactId = c.body.data.result.contact_id as string;

    expect((await act(page.request, h, 'contact_opportunity.create', { contact_id: contactId, title: 'Gói chăm sóc da', probability: 40 })).status).toBe(422);
    const o = await act(page.request, h, 'contact_opportunity.create', { contact_id: contactId, title: 'Gói chăm sóc da', amount_vnd: '30000000', stage: 'qualified' });
    expect(o.status, JSON.stringify(o.body)).toBe(200);
    const oppId = o.body.data.result.opportunity_id as string;
    const won = await act(page.request, h, 'contact_opportunity.set_stage', { opportunity_id: oppId, stage: 'won' });
    expect(won.status).toBe(422);
    expect(won.body.error.fields.stage).toBe('won_needs_document');

    await page.goto('/customers');
    const cell = page.getByTestId(`crm-opp-${contactId}`);
    await expect(cell).toContainText('Đủ điều kiện');
    await page.locator(`[data-contact="${contactId}"]`).click();
    const card = page.getByTestId('p360-opportunity');
    await expect(card.getByTestId('opp-prob')).toHaveText('25%');
    await expect(card.getByTestId('opp-next')).toContainText('Chốt lịch');

    const q = await act(page.request, h, 'quote.create', { contact_id: contactId, opportunity_id: oppId, items: [{ name: 'Liệu trình da', qty: 2, unit_price: '9000000', tax_rate: 0 }] });
    expect(q.status, JSON.stringify(q.body)).toBe(200);
    const quoteId = q.body.data.result.quote_id as string;
    expect((await act(page.request, h, 'quote.send', { quote_id: quoteId, channel: 'email' })).status).toBe(200);
    const sent = await opp(page.request, h, oppId);
    expect([sent.stage, sent.amount_vnd]).toEqual(['quote', '18000000']);
    expect((await act(page.request, h, 'quote.mark_accepted', { quote_id: quoteId })).status).toBe(200);
    expect((await opp(page.request, h, oppId)).stage).toBe('negotiation');

    await page.reload();
    await page.getByTestId(`crm-opp-${contactId}`).click();
    const drawer = page.getByTestId('opp-drawer');
    await expect(drawer.getByTestId('opp-drawer-stage')).toHaveText('Đàm phán');
    await expect(drawer.getByTestId('opp-chain-1')).toContainText('Đã chốt');
    await drawer.getByTestId('opp-lose').click();
    await drawer.getByTestId('opp-lost-competitor').click();
    await expect(drawer.getByTestId('opp-lost-box')).toContainText('Chọn đối thủ');
    await drawer.getByTestId('opp-reopen').click();
    await expect(drawer.getByTestId('opp-drawer-stage')).toHaveText('Đủ điều kiện');
    expect((await opp(page.request, h, oppId)).stage).toBe('qualified');
  });
});
