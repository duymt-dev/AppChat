// TIP-034d AC6–7 (http — pnpm e2e:http ticket-stock): workspace mới trên backend thật CHƯA có lần quan sát hôm qua → 5 thẻ KPI hiện số thật
// và huy hiệu "—" + "Chưa có số hôm qua để so" (không số 0 / xu hướng giả). Tạo ticket qua UI → thẻ Tổng 1 (meta đọc lại). Action đọc
// `ticket.stock_summary` (POST /v1/actions) trả CÙNG năm số + cùng trạng thái so sánh với `/tickets/meta` của cùng người cùng lúc, có
// `result_id`, không ghi gì (risk read). Mốc hôm qua thật + so sánh có số: integration `ticket-stock.test.ts` (Clock cố định, native).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

async function auth(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}

test.describe('ticket so với hôm qua (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('chưa có mốc → "—" + lý do; tạo ticket → Tổng 1; action đọc cùng số với meta', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'tkstock');
    await page.goto('/tickets');
    await expect(page.getByTestId('tk-kpi-total-v')).toHaveText('0');
    for (const k of ['total', 'open', 'waiting', 'breach', 'closed']) await expect(page.getByTestId(`tk-trend-${k}`)).toHaveAttribute('data-sign', 'unknown');
    await expect(page.getByTestId('tk-stock-details')).toContainText('Chưa có số hôm qua để so');
    await page.getByTestId('tk-stock-details').click();
    await expect(page.getByTestId('tk-stock-reason')).toContainText('Chưa có lần quan sát nào của hôm qua');
    await expect(page.getByTestId('tk-stock-panel')).toContainText('Asia/Ho_Chi_Minh');

    await page.getByTestId('tk-create').click();
    const f = page.getByTestId('tk-form');
    await f.getByTestId('tk-title').fill('Khách hỏi lịch bảo hành');
    await f.getByTestId('tk-category').fill('Bảo hành');
    await f.getByTestId('tk-save').click();
    await expect(f).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tk-kpi-total-v')).toHaveText('1');
    await expect(page.getByTestId('tk-kpi-open-v')).toHaveText('1');
    await expect(page.getByTestId('tk-trend-total')).toHaveAttribute('data-sign', 'unknown');

    const headers = await auth(page);
    const meta = ((await (await page.request.get('/api/v1/tickets/meta', { headers })).json()) as { data: { counts: unknown; trend: unknown; stock_summary: { counts: unknown; comparison: unknown } } }).data;
    expect(meta.counts).toEqual(meta.stock_summary.counts);
    expect(meta.trend).toEqual({ total: '', open: '', waiting: '', breach: '', closed: '' });
    const r = await page.request.post('/api/v1/actions/ticket.stock_summary', { headers: { ...headers, 'idempotency-key': `stock-${Date.now()}` }, data: { input: {} } });
    expect(r.status(), await r.text()).toBe(200);
    const out = ((await r.json()) as { data: { result: { counts: unknown; comparison: unknown; result_id: string | null; cohort: string } } }).data.result;
    expect(out.counts).toEqual(meta.stock_summary.counts);
    expect(out.comparison).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
    expect(out.cohort).toBe('current_authorized_surviving');
    expect(out.result_id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
