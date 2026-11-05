// TIP-015b (mock): Hồ sơ 360° tab AI — khối "AI ghi nhớ" (fact seed của chị Lan, xoá + Hoàn tác), "AI tóm tắt" chỉ chạy khi bấm (luật ghi
// rõ không dùng AI); danh sách khách: nút ⚡ "Giao AI" mở drawer Trợ lý với câu đề xuất điền sẵn, KHÔNG tự gửi (không có lượt nào).
import { expect, test } from '@playwright/test';
import { isMobile } from './support/mobile';

const URL = '/customers?session=authed,declared,trialSeen';

test.describe('contact-memory', () => {
  test('360° tab AI: ghi nhớ seed, xoá → Hoàn tác trả lại; tóm tắt khi bấm', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-contact="ct_lan"]').first().click();
    const p360 = page.getByTestId('crm-360');
    await p360.getByRole('tab', { name: 'AI' }).click();
    const mem = p360.getByTestId('p360-memory');
    await expect(mem).toContainText('Dị ứng tinh dầu sả');
    await expect(mem).toContainText('AI Agent');
    await expect(p360.getByTestId('p360-ai-summary')).toContainText('Bấm "Tóm tắt"');
    await p360.getByTestId('p360-summarize').click();
    await expect(p360.getByTestId('p360-ai-summary')).toContainText('Tổng hợp tự động');
    await expect(p360.getByTestId('p360-ai-summary')).toContainText('Dị ứng tinh dầu sả');
    await mem.locator('[data-memory="mem_lan_1"]').getByTestId('p360-memory-forget').click();
    await expect(mem.locator('[data-memory="mem_lan_1"]')).toHaveCount(0);
    // Toast "Đã thực hiện" có undo_until → bấm toast là hoàn tác (useAction).
    await page.locator('.ant-message-notice').filter({ hasText: 'Đã thực hiện' }).first().click();
    await expect(mem.locator('[data-memory="mem_lan_1"]')).toHaveCount(1);
  });

  test('Giao AI: mở drawer Trợ lý với câu đề xuất, không tự gửi', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.getByRole('button', { name: 'Giao AI Agent xử lý ngay' }).first().click();
    const drawer = page.getByTestId('crm-ai-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByTestId('crm-ai-ask')).toHaveValue(/Giao AI chăm sóc khách/);
    await expect(drawer.getByTestId('screen-ai-user')).toHaveCount(0);
  });
});
