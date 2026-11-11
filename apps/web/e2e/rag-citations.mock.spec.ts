// TIP-020d — E2E chế độ mock: khối "Nguồn" của câu trả lời AI đã kiểm. Gợi ý copilot / nháp bàn giao hiện nguồn (tên tài liệu + đoạn được
// chống đỡ); dùng nháp → ô soạn ghi "Nguồn của bản nháp AI gốc" (chữ sửa không được xác nhận có nguồn); xoá chữ / đổi hội thoại → mất.
// Nhật ký AI → bấm dòng → chi tiết run ở Trợ lý AI (`?run_id=`) có nguồn; đóng chỉ bỏ `run_id`; id sai dạng → không mở. Mobile 390: không tràn.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';

test.describe('nguồn câu trả lời AI (mock)', () => {
  test('gợi ý copilot hiện nguồn đã kiểm; nháp bàn giao hiện nguồn → dùng nháp → nguồn của bản nháp gốc; xoá chữ → mất', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/inbox${S}`);
    await page.locator('[data-conv="c_lan"] button').first().click();
    const sug = page.getByTestId('suggest-citations');
    await expect(sug).toHaveAttribute('data-state', 'validated');
    await expect(sug.getByTestId('ai-citation')).toHaveText('Lịch trống tuần này — “khung 14:00”');

    await page.locator('[data-conv="c_hieu"] button').first().click();
    const hand = page.getByTestId('handoff-citations');
    await expect(hand.getByTestId('ai-citation')).toContainText('Thông tin thanh toán.pdf › Tài khoản nhận tiền');
    await page.getByTestId('handoff-use-draft').click();
    const draft = page.getByTestId('draft-citations');
    await expect(draft).toHaveAttribute('data-state', 'original_draft');
    await expect(draft).toContainText('Nguồn của bản nháp AI gốc');
    await page.getByTestId('composer-input').fill('');
    await expect(draft).toHaveCount(0);
  });

  test('nhật ký AI → chi tiết run có nguồn; đóng bỏ run_id; id sai dạng không mở', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/ai_audit${S}`);
    await page.locator('[data-audit]').first().click();
    await expect(page).toHaveURL(/\/assistant\?run_id=0190f000-/);
    const drawer = page.getByTestId('run-detail');
    await expect(drawer.getByTestId('run-result')).toContainText('khung 14:00');
    await expect(drawer.getByTestId('run-citations').getByTestId('ai-citation')).toHaveText('Lịch trống tuần này — “khung 14:00”');
    await page.keyboard.press('Escape');
    await expect(page).not.toHaveURL(/run_id=/);
    await page.goto(`/assistant${S}&run_id=not-a-uuid`);
    await expect(page.getByTestId('assistant')).toBeVisible();
    await expect(page.getByTestId('run-result')).toHaveCount(0);
  });

  test('mobile 390: gợi ý có nguồn không tràn ngang', async ({ page }) => {
    test.skip(!isMobile(page), 'mobile');
    await page.goto(`/inbox${S}`);
    await page.locator('[data-conv="c_lan"] button').first().click();
    await expect(page.getByTestId('suggest-citations')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
