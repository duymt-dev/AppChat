// TIP-021 AC6 — E2E chế độ http (pnpm e2e:http): AI Agents trên backend thật (model giả — Q-001). Builder: chọn mẫu prompt → tối
// ưu → chat thử (dry-run, trả lời từ model) → xuất bản → thẻ v1 trong danh sách → sửa + xuất bản v2 → quay lại v1 (v3) → tạm dừng;
// tải lại vẫn giữ. Cài đặt › AI Governance: bật phạm vi PII + thêm từ khoá → tải lại vẫn giữ (đọc từ `ai_governance`).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('AI Agents (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('builder → xuất bản v1 → sửa v2 → quay lại → tạm dừng; tải lại vẫn giữ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'agents');
    await page.goto('/agents');
    await expect(page.getByTestId('ag-card')).toHaveCount(0);
    await page.getByTestId('ag-new').click();
    await expect(page.getByTestId('agent-builder')).not.toContainText(/Claude|Sonnet|Haiku|Opus|GPT/);
    await page.getByTestId('agb-tpl').click();
    await page.getByRole('menuitem', { name: 'Đặt lịch hẹn' }).click();
    await expect(page.getByTestId('agb-prompt')).toHaveValue(/trợ lý đặt lịch hẹn/);
    await page.getByTestId('agb-optimize').click();
    await expect(page.getByTestId('agb-prompt')).toHaveValue(/ĐỊNH DẠNG TRẢ LỜI/);
    await page.getByTestId('agb-test-input').fill('Spa mở cửa mấy giờ?');
    await page.getByTestId('agb-test-send').click();
    await expect(page.getByTestId('agb-ai-msg').nth(1)).toContainText('Spa mở cửa mấy giờ?');
    await page.getByTestId('agb-name').fill('Booking Spa');
    await page.getByTestId('agb-publish').click();

    const card = page.getByTestId('ag-card').filter({ hasText: 'Booking Spa' });
    await expect(card).toHaveCount(1);
    await expect(card.getByTestId('ag-version')).toHaveText('v1');
    await expect(card.getByTestId('ag-status')).toHaveText('Đang chạy');

    await card.getByTestId('ag-edit').click();
    await expect(page.getByTestId('agb-name')).toHaveValue('Booking Spa');
    await page.getByTestId('agb-threshold').fill('85');
    await page.getByTestId('agb-publish').click();
    await expect(card.getByTestId('ag-version')).toHaveText('v2');

    await card.getByTestId('ag-versions').click();
    await expect(page.getByTestId('ag-ver')).toHaveCount(2);
    await page.locator('[data-version="1"]').getByTestId('ag-rollback').click();
    await expect(card.getByTestId('ag-version')).toHaveText('v3');
    await expect(page.getByTestId('ag-ver').first()).toContainText('↩ v1');
    await page.getByTestId('ag-versions-drawer').getByRole('button', { name: 'Đóng' }).click();

    await card.getByTestId('ag-toggle').click();
    await expect(card.getByTestId('ag-status')).toHaveText('Tạm dừng');
    await page.reload();
    const again = page.getByTestId('ag-card').filter({ hasText: 'Booking Spa' });
    await expect(again.getByTestId('ag-version')).toHaveText('v3');
    await expect(again.getByTestId('ag-status')).toHaveText('Tạm dừng');
  });

  test('AI Governance: bật phạm vi PII + thêm từ khoá cấm — tải lại vẫn giữ', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'gov');
    await page.goto('/settings/ai_gov');
    const pii = page.getByTestId('st-gov-scope-pii');
    await expect(pii).toHaveAttribute('aria-checked', 'false');
    await pii.click();
    await expect(pii).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('st-gov-kw-input').fill('cam kết khỏi bệnh');
    await page.getByTestId('st-gov-kw-input').press('Enter');
    await expect(page.getByTestId('st-gov-keywords')).toContainText('cam kết khỏi bệnh');
    await page.reload();
    await expect(page.getByTestId('st-gov-scope-pii')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('st-gov-keywords')).toContainText('cam kết khỏi bệnh');
  });
});
