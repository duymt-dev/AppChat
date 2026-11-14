// E2E kế hoạch Cowork (TIP-023d §6, mock): lượt "lập kế hoạch" → thẻ kế hoạch có tiến độ thật (1/3); Sửa kế hoạch → Đã dừng → sửa tên
// bước chưa chạy → Lưu (bản 2) → Tiếp tục; picker agent (chọn theo id, "Không chọn"); gợi ý dùng lại cách làm trước → bản nháp gắn lượt
// kế. 390: không tràn ngang, vùng chạm ≥ 44px.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';

const ask = async (page: Page, text: string) => {
  const box = page.getByTestId('asst-composer').locator('textarea');
  await box.fill(text);
  await box.press('Enter');
};

test.describe('assistant-plans', () => {
  test('thẻ kế hoạch: tiến độ thật → sửa → lưu bước chưa chạy → tiếp tục', async ({ page }) => {
    await page.goto(`/assistant${Q}`);
    await page.getByRole('radio', { name: 'Cowork' }).first().click();
    await ask(page, 'Lập kế hoạch chăm sóc khách mới');
    const card = page.getByTestId('plan-card');
    await expect(card).toHaveAttribute('data-phase', 'active');
    await expect(card.getByTestId('plan-progress')).toContainText('1/3');
    await expect(card.getByTestId('plan-step')).toHaveCount(3);
    await expect(card.getByTestId('plan-step').nth(1)).toHaveAttribute('data-state', 'waiting_confirmation');
    await expect(card).toContainText('không hoàn tác');
    await card.getByTestId('plan-request-edit').click();
    await expect(card).toHaveAttribute('data-phase', 'paused');
    await card.getByTestId('plan-edit').click();
    const rows = card.getByTestId('plan-edit-step');
    await expect(rows).toHaveCount(1);
    await rows.first().locator('input').fill('Gửi báo giá qua Zalo');
    await card.getByTestId('plan-save').click();
    await expect(card).toContainText('Bản 2');
    await expect(card).toContainText('Gửi báo giá qua Zalo');
    if (isMobile(page)) {
      await expectNoHorizontalOverflow(page);
      await expectTouchTargets(card.locator('button'));
    }
    await card.getByTestId('plan-resume').click();
    await expect(card).toHaveAttribute('data-phase', 'active');
  });

  test('chọn agent theo id + bỏ chọn; dùng lại cách làm trước → bản nháp chạy ở lượt kế', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant${Q}`);
    await page.getByRole('radio', { name: 'Cowork' }).first().click();
    await page.getByTestId('asst-agent').click();
    const first = page.getByTestId('asst-agent-choice').first();
    const name = (await first.textContent())!.replace('✓', '').trim();
    await first.click();
    await expect(page.getByTestId('asst-agent')).toContainText(name);
    await page.getByTestId('asst-agent').click();
    await page.getByTestId('asst-agent-none').click();
    await expect(page.getByTestId('asst-agent')).not.toContainText(name);

    await ask(page, 'chào');
    await page.getByTestId('asst-composer').locator('textarea').fill('tạo báo giá cho khách');
    const reuse = page.getByTestId('plan-reuse-item');
    await expect(reuse).toHaveCount(1);
    await reuse.click();
    await ask(page, 'làm như lần trước');
    await expect(page.getByTestId('plan-card')).toHaveAttribute('data-phase', 'active');
    await expect(page.getByTestId('plan-card').getByTestId('plan-step')).toHaveCount(2);
  });
});
