// TIP-037 — E2E chế độ http (pnpm e2e:http): Marketing trên backend thật + worker ROLE=jobs (quét chiến dịch mỗi phút) + ROLE=channels
// (Zalo giả, tin chào `ZALO_FAKE_GREETING` → khách thật có hội thoại 1-1). Wizard chọn khách theo id thật → Gửi duyệt → chi tiết hiện
// người nhận snapshot → Duyệt & gửi qua hộp xác nhận → scheduler nhận lô → worker gửi qua hàng tài khoản → người nhận "Đã gửi" (DB thật,
// tải lại vẫn đúng); xuất CSV tải bytes thật; AI phân tích xếp hàng (không toast giả); trang huỷ nhận tin công khai token sai → không hợp lệ.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('marketing (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Zalo giả: khách nhắn → wizard chọn khách → gửi duyệt → duyệt → worker gửi → Đã gửi; xuất CSV; AI phân tích xếp hàng', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(240_000);
    await onboarded(page, 'marketing');

    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-zalo_personal').click();
    const cw = page.getByTestId('st-ch-wizard');
    await cw.getByTestId('st-ch-wizard-risk-ack').check();
    await cw.getByTestId('st-ch-wizard-label').fill('Zalo Marketing');
    await cw.getByTestId('st-ch-wizard-next').click();
    await expect(cw.getByTestId('st-ch-wizard-cfg-name')).toBeVisible({ timeout: 30_000 });
    await cw.getByTestId('st-ch-wizard-next').click();
    await expect(cw).toHaveCount(0);
    await expect(async () => {
      await page.goto('/inbox');
      await expect(page.getByTestId('conv-row')).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    // Chưa có chiến dịch: danh sách rỗng, không có dữ liệu mẫu.
    await page.goto('/marketing');
    await expect(page.locator('[data-campaign]')).toHaveCount(0);

    await page.getByTestId('mk-create').click();
    const w = page.getByTestId('mk-wizard');
    await w.getByTestId('mk-wiz-ch-zalo').click();
    await w.getByTestId('mk-wiz-next').click();
    await w.locator('[data-cust]').filter({ hasText: 'Khách E2E' }).click();
    await w.getByTestId('mk-wiz-next').click();
    await w.getByTestId('mk-wiz-name').fill('Tri ân E2E');
    await w.getByTestId('mk-wiz-body').fill('Chào {ten}, cảm ơn đã ghé shop');
    await w.getByTestId('mk-wiz-next').click();
    await expect(w.getByTestId('mk-wiz-account')).toContainText('Zalo Marketing');
    await expect(w.getByTestId('mk-wiz-aud')).toHaveText('1');
    await w.getByTestId('mk-wiz-submit').click();
    await expect(w).toHaveCount(0);

    const row = page.locator('[data-campaign]').filter({ hasText: 'Tri ân E2E' });
    await expect(row.getByTestId('mk-row-status')).toHaveText('Chờ duyệt');
    await row.click();
    const d = page.getByTestId('mk-detail');
    await expect(d.locator('[data-rec]')).toHaveCount(1);
    await d.getByTestId('mk-approve').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(d.getByTestId('mk-row-status')).toHaveText(/Đã duyệt|Đang chạy|Hoàn thành/);

    // Scheduler (mỗi phút) nhận lô → worker kênh gửi → kết quả ghi qua campaign.record_delivery.
    await expect(async () => {
      await page.reload();
      await page.locator('[data-campaign]').filter({ hasText: 'Tri ân E2E' }).click();
      await expect(page.getByTestId('mk-detail').locator('[data-rec="sent"]')).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 150_000, intervals: [5_000] });
    const dd = page.getByTestId('mk-detail');
    const dl = page.waitForEvent('download');
    await dd.getByTestId('mk-export').click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/nguoi-nhan\.csv$/);
    await dd.getByTestId('mk-detail-back').click();

    // AI phân tích: request chỉ xếp hàng — modal hiện trạng thái chạy, không gợi ý giả.
    await page.getByTestId('mk-analyze').click();
    const m = page.getByTestId('mk-analyze-modal');
    await m.getByTestId('mk-an-rerun').click();
    await expect(m.getByTestId('mk-an-running')).toBeVisible();
    // Worker ROLE=jobs (consumer) → ROLE=ai (model giả) → campaign.store_analysis → modal rời trạng thái chạy (bảng gợi ý / rỗng).
    await expect(m.getByTestId('mk-an-table')).toBeVisible({ timeout: 90_000 });

    await page.goto('/campaign/unsubscribe?t=khong-hop-le');
    await expect(page.getByTestId('unsub-invalid')).toBeVisible();
  });
});
