// TIP-014b — thao tác kênh trên tin Zalo, backend thật + worker ROLE=channels với Zalo giả: cảm xúc trên tin của khách và thu hồi tin
// nhân viên vừa gửi đi qua lệnh bền → hàng đợi tài khoản → nhà cung cấp ACK → tin đổi. Trước ACK tin hiện "đang …" và nội dung giữ nguyên (không giả thành công).
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
    await w.getByTestId('st-ch-wizard-risk-ack').check();
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
    // Lệnh bền → worker gọi Zalo giả → ACK → cảm xúc đã xác nhận, không còn dòng trạng thái (kể cả "Zalo không nhận"); tải lại vẫn đúng.
    await expect(async () => {
      await page.reload();
      const m = page.getByTestId('thread').getByTestId('msg-in').first();
      await expect(m).toContainText('👍', { timeout: 2_000 });
      await expect(m.getByTestId('provider-op-react')).toHaveCount(0, { timeout: 1_000 });
    }).toPass({ timeout: 30_000 });

    // Thu hồi chỉ áp cho tin của mình (REQ-C09): gửi một tin → Zalo giả ACK + self-event (cliMsgId) → thu hồi qua lệnh bền.
    const input = page.getByTestId('composer-input');
    await input.fill('Dạ shop xin phép thu hồi tin này');
    await input.press('Enter');
    const out = page.getByTestId('thread').getByTestId('msg-out').last();
    await expect(out).toContainText('Dạ shop xin phép thu hồi tin này');
    await expect(async () => {
      await out.getByTestId('msg-dots').click();
      await page.getByTestId('chat-menu').getByRole('menuitem', { name: /Thu hồi/ }).click();
      await page.reload();
      await expect(page.getByTestId('thread')).not.toContainText('Dạ shop xin phép thu hồi tin này', { timeout: 3_000 });
    }).toPass({ timeout: 45_000 });
    await expect(page.getByTestId('thread').getByTestId('provider-op-recall')).toHaveCount(0);
    await expect(page.getByTestId('thread').getByTestId('msg-in').first()).toContainText('Chào shop, cho mình hỏi lịch hẹn');
  });
});
