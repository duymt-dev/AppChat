// TIP-014b — thao tác kênh trên tin Zalo (mock): cảm xúc / thu hồi là lệnh bền — bấm xong tin hiện "đang gửi lên Zalo…" (chưa coi là xong),
// chỉ đổi khi nhà cung cấp xác nhận (lần đọc trạng thái sau). Nội dung tin giữ nguyên tới khi xác nhận thu hồi. Kênh web chat áp ngay.
import { expect, test } from '@playwright/test';
import { isMobile } from './support/mobile';

const URL = '/inbox?session=authed,declared,trialSeen';

test.describe('channel-operations', () => {
  test('cảm xúc Zalo: đang gửi → xác nhận; thu hồi: nội dung giữ tới khi Zalo xác nhận', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const thread = page.getByTestId('thread');
    const msg = thread.locator('#msg-m3');
    await expect(msg).toContainText('Em ơi, bên spa mình');

    await msg.getByTestId('msg-dots').click();
    await page.getByTestId('chat-menu').locator('button[title]').first().click();
    // Chờ ACK: dòng trạng thái "đang gửi cảm xúc lên Zalo" hiện trước, rồi biến mất khi xác nhận.
    await expect(msg.getByTestId('provider-op-react')).toBeVisible();
    await expect(msg.getByTestId('provider-op-react')).toHaveCount(0, { timeout: 15_000 });

    await msg.getByTestId('msg-dots').click();
    await page.getByTestId('chat-menu').getByRole('menuitem', { name: /Thu hồi/ }).click();
    await expect(msg.getByTestId('provider-op-recall')).toContainText('Đang thu hồi trên Zalo');
    // Chưa xác nhận → nội dung chưa bị ẩn (không giả thu hồi thành công).
    await expect(msg).toContainText('Em ơi, bên spa mình');
    await expect(msg.getByTestId('provider-op-recall')).toHaveCount(0, { timeout: 15_000 });
    await expect(msg).not.toContainText('Em ơi, bên spa mình');
  });
});
