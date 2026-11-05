// TIP-015b — E2E chế độ http (pnpm e2e:http): trí nhớ khách + tóm tắt theo phạm vi trên backend thật (model giả `AI_ENGINE=mock`). Ghi
// một fact qua `contact.remember` (đường agent dùng) → Hồ sơ 360° tab AI hiện fact nguồn "AI Agent"; "Tóm tắt" → model tóm từ dữ liệu
// người xem được thấy (có fact); xoá fact → bấm toast hoàn tác → fact trở lại. Danh sách: nút ⚡ "Giao AI" điền sẵn câu đề xuất vào drawer
// Trợ lý, không tự gửi. Phạm vi cache (Owner ≠ CS), trần 50, chống trùng, recheck fingerprint kiểm ở integration.
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

test.describe('trí nhớ khách (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('remember → 360° tab AI → tóm tắt có fact → xoá + hoàn tác → Giao AI không tự gửi', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'contact-memory');
    const { contact_id } = await act<{ contact_id: string }>(page, 'contact.create', { full_name: 'Chị Lan Trí Nhớ', phone: '0909 715 001' });
    const r = await act<{ memory_id: string; status: string }>(page, 'contact.remember', { contact_id, fact: 'Dị ứng tinh dầu sả', confidence: 0.9 });
    expect(r.status).toBe('created');
    expect((await act<{ status: string }>(page, 'contact.remember', { contact_id, fact: 'dị ứng tinh dầu sả.' })).status).toBe('refreshed');

    await page.goto('/customers');
    await page.locator(`[data-contact="${contact_id}"]`).first().click();
    const p360 = page.getByTestId('crm-360');
    await p360.getByRole('tab', { name: 'AI' }).click();
    const mem = p360.getByTestId('p360-memory');
    await expect(mem.locator('[data-memory]')).toHaveCount(1);
    await expect(mem).toContainText('Dị ứng tinh dầu sả');

    const sum = p360.getByTestId('p360-ai-summary');
    await expect(sum).toContainText('Bấm "Tóm tắt"');
    await p360.getByTestId('p360-summarize').click();
    await expect(sum).toContainText('Do AI tóm tắt');
    await expect(sum).toContainText('Dị ứng tinh dầu sả');

    await mem.locator(`[data-memory="${r.memory_id}"]`).getByTestId('p360-memory-forget').click();
    await expect(mem.locator('[data-memory]')).toHaveCount(0);
    await page.locator('.ant-message-notice').filter({ hasText: 'Đã thực hiện' }).first().click();
    await expect(mem.locator(`[data-memory="${r.memory_id}"]`)).toHaveCount(1);
    await p360.getByRole('button', { name: 'Đóng' }).click();

    // Khách mới → luật "wait" (tư vấn) → nút ⚡ có; bấm chỉ điền câu, không có lượt nào trong luồng.
    await page.locator(`[data-contact="${contact_id}"]`).first().getByRole('button', { name: 'Giao AI Agent xử lý ngay' }).click();
    const drawer = page.getByTestId('crm-ai-drawer');
    await expect(drawer.getByTestId('crm-ai-ask')).toHaveValue(/Giao AI chăm sóc khách Chị Lan Trí Nhớ/);
    await expect(drawer.getByTestId('screen-ai-user')).toHaveCount(0);
  });
});
