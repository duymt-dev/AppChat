// TIP-023c AC4 — E2E chế độ http (pnpm e2e:http): Trợ lý theo màn trên backend thật (model giả `AI_ENGINE=mock`, ngữ cảnh do server
// đọc lại theo quyền hiện hành). (1) Drawer Báo giá khi đang mở BG-xxxx → "báo giá này còn hiệu lực không" → trả lời đúng bản ghi
// (`quote.get` theo id ngữ cảnh). (2) Khách hàng chọn 3 dòng → "gắn thẻ VIP cho các khách đang chọn" → đủ 3 thẻ xác nhận (mỗi khách một
// lời gọi `contact.tag` — DV-023), xác nhận cả 3 → bảng có thẻ VIP. (3) "Phân tích nhanh" → cây GenUI compact (bảng `$ref` bước
// `contact.search`) → "Mở rộng" → modal đủ cột.
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

const CUSTOMERS = [
  ['Chị Lan Genui', '0909 551 001'],
  ['Anh Minh Genui', '0909 551 002'],
  ['Chị Hoa Genui', '0909 551 003'],
  ['Anh Tuấn Genui', '0909 551 004'],
] as const;

test.describe('Trợ lý theo màn (http)', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await spoofIp(page);
  });

  test('báo giá đang mở → hỏi hiệu lực đúng bản ghi; chọn 3 khách → 3 thẻ VIP; Phân tích nhanh → cây → Mở rộng', async ({ page }) => {
    test.setTimeout(150_000);
    await onboarded(page, 'screen-ai');
    const ids: string[] = [];
    for (const [full_name, phone] of CUSTOMERS) ids.push((await act<{ contact_id: string }>(page, 'contact.create', { full_name, phone })).contact_id);
    const q = await act<{ quote_id: string; code: string }>(page, 'quote.create', { contact_id: ids[0], items: [{ name: 'HIFU nâng cơ', qty: 1, unit_price: '1500000', tax_rate: 8 }] });

    // (1) Báo giá đang mở → hỏi Trợ lý về "báo giá này".
    await page.goto('/quotes');
    await page.locator(`[data-quote="${q.quote_id}"]`).click();
    await expect(page.getByTestId('q-drawer')).toContainText(q.code);
    // Drawer chi tiết đang mở (mask che thanh trên màn) → hỏi qua Trợ lý thu nhỏ (Ctrl+K) — cùng phiên + ngữ cảnh màn Báo giá.
    await page.keyboard.press('Control+k');
    const dock = page.getByTestId('assistant-dock');
    await dock.getByTestId('dock-input').fill('báo giá này còn hiệu lực không?');
    await dock.getByTestId('dock-input').press('Enter');
    const reply = dock.getByTestId('screen-ai-msg').last();
    await expect(reply).toContainText(q.code, { timeout: 30_000 });
    await expect(reply).toContainText('chưa gửi');
    await dock.getByRole('button', { name: 'Đóng' }).click();
    await expect(dock).toHaveCount(0);

    // (2) Chọn 3 dòng → gắn thẻ VIP → đủ 3 thẻ xác nhận, không chạy thẳng.
    await page.goto('/customers');
    for (const id of ids.slice(0, 3)) await page.locator(`[data-contact="${id}"]`).getByRole('checkbox').check();
    await page.getByTestId('crm-ai').click();
    const drawer = page.getByTestId('crm-ai-drawer');
    const box = drawer.getByRole('textbox');
    const cards = drawer.getByTestId('screen-ai-card');
    await box.fill('gắn thẻ VIP cho các khách đang chọn');
    await box.press('Enter');
    for (let n = 1; n <= 3; n++) {
      await expect(cards).toHaveCount(n, { timeout: 30_000 });
      await expect(cards.nth(n - 1)).toHaveAttribute('data-status', 'pending');
      await cards.nth(n - 1).getByRole('button', { name: 'Xác nhận' }).click();
      await expect(cards.nth(n - 1)).toHaveAttribute('data-status', 'done', { timeout: 30_000 });
    }
    await expect(drawer.getByTestId('screen-ai-msg').last()).toContainText('3 khách', { timeout: 30_000 });
    await expect(cards).toHaveCount(3);
    const rows = ((await (await page.request.get('/api/v1/contacts?limit=50', { headers: await auth(page) })).json()) as { data: { id: string; tags: string[] }[] }).data;
    const tagged = (id: string) => rows.find((r) => r.id === id)?.tags.includes('VIP');
    expect(ids.map(tagged)).toEqual([true, true, true, false]);
    await page.reload();

    // (3) Phân tích nhanh → cây compact (3 cột) → Mở rộng → modal đủ 4 cột.
    await page.getByTestId('crm-ai').click();
    await drawer.getByTestId('crm-ai-run-pipeline').click();
    const ui = drawer.getByTestId('genui').last();
    await expect(ui).toHaveAttribute('data-mode', 'compact', { timeout: 30_000 });
    await expect(ui.getByTestId('genui-table')).toContainText('Anh Tuấn Genui');
    await ui.getByTestId('genui-expand').click();
    const modal = page.getByTestId('genui-modal');
    await expect(modal).toContainText('Khách đang theo dõi');
    await expect(modal.getByTestId('genui-table').locator('th')).toHaveCount(4);
  });
});
