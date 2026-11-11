// TIP-020d — E2E chế độ http (pnpm e2e:http): trích dẫn câu trả lời trên backend thật (AI_ENGINE=mock — model giả trích dẫn bí danh `S1`
// của đoạn đầu trong ngữ cảnh). Nguồn public thẻ FAQ → agent phạm vi thẻ trực widget → khách hỏi → agent tự gửi câu trả lời CÓ nguồn đã
// kiểm (run `validated`). Nhật ký AI → bấm dòng → chi tiết run ở Trợ lý AI có khối "Nguồn" (tên tài liệu theo quyền người xem); nạp lại
// nguồn → chi tiết run `unavailable`, không lộ tên. Model không thấy tên tài liệu (kiểm ở integration).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-cite.e2e.test';
const NAME = 'bang-gio-mo-cua-huong-sen.pdf';

async function headers(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act(page: Page, id: string, input: unknown) {
  const r = await page.request.post(`/api/v1/actions/${id}`, { headers: { ...(await headers(page)), 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  return { status: r.status(), body: (await r.json()) as { data?: { result?: Record<string, unknown> }; error?: { code: string } } };
}
async function get<T>(page: Page, path: string): Promise<T> {
  return ((await (await page.request.get(`/api/v1${path}`, { headers: await headers(page) })).json()) as { data: T }).data;
}

test.describe('nguồn câu trả lời AI (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('agent tự gửi câu trả lời có nguồn đã kiểm; nhật ký AI → chi tiết run hiện nguồn; nạp lại nguồn → không còn khả dụng', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(180_000);
    await onboarded(page, 'cite');
    const src = await act(page, 'kb.add_source', { name: NAME, text: 'Spa Hương Sen mở cửa từ 8 giờ đến 20 giờ mỗi ngày.', visibility: 'public', tags: ['FAQ'] });
    expect(src.status, JSON.stringify(src.body)).toBe(200);
    const srcId = src.body.data!.result!.source_id as string;
    const ag = await act(page, 'agent.create_and_publish', { name: 'Lễ tân nguồn', role: 'cs', tools: ['kb.search'], threshold: 70, kb_scope: { folder_ids: [], tags: ['FAQ'] } });
    expect(ag.status, JSON.stringify(ag.body)).toBe(200);

    await page.goto('/settings/web_widget');
    const embed = page.getByTestId('st-wg-embed');
    await page.getByTestId('st-wg-enabled').click();
    await expect(embed).toContainText('data-key="wk_', { timeout: 15_000 });
    await page.getByTestId('st-wg-agent').filter({ hasText: 'Lễ tân nguồn' }).click();
    await expect(async () => {
      await page.reload();
      await expect(page.locator('body')).toContainText('Lễ tân nguồn', { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    const code = (await embed.textContent())!;
    const key = /data-key="([^"]+)"/.exec(code)![1]!;
    const api = /data-api="([^"]+)"/.exec(code)![1]!;

    await context.grantPermissions(['local-network-access']);
    const shop = await context.newPage();
    await shop.route(`${SHOP}/**`, (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="vi"><body><script src="${api}/widget.js" async data-key="${key}" data-api="${api}"></script></body></html>` }));
    await shop.goto(`${SHOP}/`);
    const w = shop.locator('appchat-widget');
    await w.getByTestId('wg-launcher').click();
    await w.getByTestId('wg-pre-name').fill('Chị Hà Nguồn');
    await w.getByTestId('wg-pre-phone').fill('0907123988');
    await w.getByTestId('wg-pre-start').click();
    await w.getByTestId('wg-input').fill('Spa Hương Sen mở cửa mấy giờ?');
    await w.getByTestId('wg-input').press('Enter');
    // Agent tự gửi câu trả lời có nguồn (model giả trích dẫn đoạn S1).
    await expect(w.getByTestId('wg-msg-out').last()).toContainText('8 giờ đến 20 giờ', { timeout: 45_000 });

    // Nhật ký AI → dòng run trả lời → chi tiết run có khối Nguồn (tên tài liệu — Owner đọc được).
    // Run trả lời kênh của agent (nhật ký AI còn run khác của onboarding) — chọn theo id rồi bấm đúng dòng.
    const rows = await get<{ id: string; actor: string; agent_name: string | null }[]>(page, '/settings/ai-audit');
    const runId = rows.find((r) => r.agent_name === 'Lễ tân nguồn')!.id;
    await page.goto('/settings/ai_audit');
    await page.locator(`[data-run="${runId}"]`).click();
    await expect(page).toHaveURL((u) => u.pathname === '/assistant' && u.searchParams.get('run_id') === runId);
    const cites = page.getByTestId('run-detail').getByTestId('run-citations');
    await expect(cites).toHaveAttribute('data-state', 'validated');
    await expect(cites.getByTestId('ai-citation')).toContainText(NAME);

    // Nạp lại nguồn (thế hệ đổi) → chi tiết run: nguồn không còn khả dụng, không tên.
    expect((await act(page, 'kb.refresh_source', { source_id: srcId })).status).toBe(200);
    await expect(async () => {
      const d = await get<{ citations: { state: string } | null }>(page, `/runs/${runId}`);
      expect(d.citations?.state).toBe('unavailable');
    }).toPass({ timeout: 30_000 });
    await page.reload();
    const after = page.getByTestId('run-detail').getByTestId('run-citations');
    await expect(after).toHaveAttribute('data-state', 'unavailable');
    await expect(after).not.toContainText(NAME);
  });
});
