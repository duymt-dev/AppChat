// TIP-014b — thao tác kênh trên tin Zalo, backend thật + worker ROLE=channels với Zalo giả: cảm xúc + thu hồi trên tin của khách đi qua
// lệnh bền → hàng đợi tài khoản → nhà cung cấp ACK → tin đổi. Trước ACK tin hiện "đang …" và nội dung giữ nguyên (không giả thành công).
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('thao tác kênh (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Zalo giả: cảm xúc + thu hồi qua lệnh bền, đổi chỉ sau ACK', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'chops');

    await page.goto('/settings/channels');
    await page.getByTestId('st-ch-zalo_personal').click();
    const w = page.getByTestId('st-ch-wizard');
    await w.getByTestId('st-ch-wizard-label').fill('Zalo Thao tác');
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w.getByTestId('st-ch-wizard-cfg-name')).toBeVisible({ timeout: 30_000 });
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);

    await expect(async () => {
      await page.goto('/inbox');
      await expect(page.getByTestId('conv-row')).toHaveCount(1, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await page.getByTestId('conv-row').first().locator('button').first().click();
    const msg = page.getByTestId('thread').getByTestId('msg-in').first();
    await expect(msg).toContainText('Chào shop, cho mình hỏi lịch hẹn');

    await msg.getByTestId('msg-dots').click();
    await page.getByTestId('chat-menu').locator('button[title]').first().click();
    // Lệnh bền → worker gọi Zalo giả → ACK → dòng trạng thái biến mất (tải lại vẫn đúng).
    await expect(msg.getByTestId('provider-op-react')).toHaveCount(0, { timeout: 30_000 });

    await msg.getByTestId('msg-dots').click();
    await page.getByTestId('chat-menu').getByRole('menuitem', { name: /Thu hồi/ }).click();
    await expect(async () => {
      await page.reload();
      await expect(page.getByTestId('thread').getByTestId('msg-in').first()).not.toContainText('Chào shop, cho mình hỏi lịch hẹn', { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByTestId('thread').getByTestId('provider-op-recall')).toHaveCount(0);
  });
});
