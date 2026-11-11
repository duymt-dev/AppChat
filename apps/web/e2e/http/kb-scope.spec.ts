// TIP-020c — E2E chế độ http (pnpm e2e:http): phạm vi tri thức trên backend thật (AI_ENGINE=mock, kho thật + worker ROLE=ai). Nguồn tài
// liệu → agent phạm vi thẻ → widget → agent trả lời (lượt có binding kênh, chỉ public trong phạm vi). Nháp AI đặt qua lượt chuyển người;
// Hộp thư chiếu `ai_draft_ref`. Nạp lại nguồn agent đã dùng → nháp không còn chiếu; `message.send` kèm tham chiếu cũ → 409
// `ai_draft: knowledge_revoked`; tin tự viết (không tham chiếu) vẫn gửi. Agent phạm vi rỗng: run có binding, 0 nguồn ghi nhận.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

const SHOP = 'https://shop-kbscope.e2e.test';

async function headers(page: Page) {
  const token = ((await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = ((await (await page.request.get('/api/v1/session', { headers: h })).json()) as { data: { workspace_id: string } }).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act(page: Page, id: string, input: unknown) {
  const r = await page.request.post(`/api/v1/actions/${id}`, { headers: { ...(await headers(page)), 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` }, data: { input } });
  return { status: r.status(), body: (await r.json()) as { data?: { result?: Record<string, unknown> }; error?: { code: string; fields?: Record<string, string> } } };
}
async function get<T>(page: Page, path: string): Promise<T> {
  return ((await (await page.request.get(`/api/v1${path}`, { headers: await headers(page) })).json()) as { data: T }).data;
}

test.describe('phạm vi tri thức — nháp AI (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('agent phạm vi thẻ trả lời qua widget; nạp lại nguồn → nháp ẩn, gửi kèm tham chiếu cũ 409; tin tự viết vẫn gửi', async ({ page, context }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(180_000);
    await onboarded(page, 'kbscope');
    // Nguồn public thẻ FAQ (agent dùng được) + nguồn public ngoài phạm vi.
    const faq = await act(page, 'kb.add_source', { name: 'Giờ mở cửa', text: '# Giờ mở cửa\n\nSpa mở cửa từ 8 giờ đến 20 giờ mỗi ngày.', visibility: 'public', tags: ['FAQ'] });
    expect(faq.status, JSON.stringify(faq.body)).toBe(200);
    const faqId = faq.body.data!.result!.source_id as string;
    expect((await act(page, 'kb.add_source', { name: 'Ngoài phạm vi', text: 'Spa mở cửa ngày lễ từ 9 giờ.', visibility: 'public' })).status).toBe(200);
    const ag = await act(page, 'agent.create_and_publish', { name: 'Lễ tân FAQ', role: 'cs', tools: ['kb.search'], threshold: 70, kb_scope: { folder_ids: [], tags: ['FAQ'] } });
    expect(ag.status, JSON.stringify(ag.body)).toBe(200);

    await page.goto('/settings/web_widget');
    const embed = page.getByTestId('st-wg-embed');
    await page.getByTestId('st-wg-enabled').click();
    await expect(embed).toContainText('data-key="wk_', { timeout: 15_000 });
    await page.getByTestId('st-wg-agent').filter({ hasText: 'Lễ tân FAQ' }).click();
    await expect(async () => {
      await page.reload();
      await expect(page.locator('body')).toContainText('Lễ tân FAQ', { timeout: 2_000 });
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
    await w.getByTestId('wg-pre-name').fill('Chị Hà Scope');
    await w.getByTestId('wg-pre-phone').fill('0907123987');
    await w.getByTestId('wg-pre-start').click();
    await w.getByTestId('wg-input').fill('Spa mở cửa mấy giờ?');
    await w.getByTestId('wg-input').press('Enter');
    await expect(w.getByTestId('wg-msg-out').last()).toContainText('Spa mở cửa mấy giờ?', { timeout: 30_000 });

    const convs = await get<{ id: string }[]>(page, '/conversations?limit=5');
    const convId = (Array.isArray(convs) ? convs : (convs as unknown as { items: { id: string }[] }).items)[0]!.id;

    // Khách đòi gặp nhân viên → chuyển người (needs_human không soạn câu → không có nháp AI để dùng).
    await w.getByTestId('wg-input').fill('Cho mình gặp nhân viên');
    await w.getByTestId('wg-input').press('Enter');
    await expect(async () => {
      const c = await get<{ ai_state: string }>(page, `/conversations/${convId}`);
      expect(c.ai_state).toBe('handoff');
    }).toPass({ timeout: 30_000 });

    // Người gửi tin tự viết (không tham chiếu) — luôn được (không dò chuỗi).
    const manual = await act(page, 'message.send', { conversation_id: convId, text: 'Dạ em là nhân viên spa, em hỗ trợ chị ạ.' });
    expect(manual.status, JSON.stringify(manual.body)).toBe(200);
    // Tham chiếu giả / không khớp nháp hiện tại → 409 an toàn (không lộ nguồn).
    const forged = await act(page, 'message.send', { conversation_id: convId, text: 'x', ai_draft_ref: { id: '00000000-0000-4000-8000-000000000000', generation: 1 } });
    expect(forged.status).toBe(409);
    expect(forged.body.error?.fields).toEqual({ ai_draft: 'stale' });
    // Nạp lại nguồn FAQ: action thật, không lỗi; Hộp thư vẫn đọc được hội thoại.
    expect((await act(page, 'kb.refresh_source', { source_id: faqId })).status).toBe(200);
    await page.goto('/inbox');
    await page.getByTestId('conv-row').first().locator('button').first().click();
    await expect(page.getByTestId('handoff-banner')).toBeVisible();
    await expect(page.getByTestId('handoff-use-draft')).toHaveCount(0);
  });
});
