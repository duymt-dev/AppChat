// TIP-014b E — bạn bè Zalo trong drawer quản lý kênh (mock): lời mời tới → Nhận → Zalo đã nhận; tra một SĐT → kết quả tạm → Gửi lời mời
// (xác nhận rủi ro) → Thu hồi; số không có Zalo → báo rõ. Không hàng loạt, không tự lưu khách.
import { expect, test } from '@playwright/test';
import { isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';

test.describe('settings — bạn bè Zalo', () => {
  test('nhận lời mời, tra SĐT, gửi + thu hồi lời mời', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/channels${S}`);
    await page.getByTestId('st-ch-zalo_personal').click();
    const drawer = page.getByTestId('st-ch-drawer');
    await drawer.getByTestId(/^st-ch-drawer-acct-/).first().click();
    const f = drawer.getByTestId('st-ch-friends');
    await f.scrollIntoViewIfNeeded();

    await expect(f.getByTestId('st-ch-friend-req')).toHaveCount(1);
    await f.getByTestId('st-ch-friend-accept').click();
    await expect(f.getByTestId('st-ch-friend-status')).toHaveAttribute('data-status', 'confirmed');
    await expect(f.getByTestId('st-ch-friend-req')).toHaveCount(0);

    await f.getByTestId('st-ch-lookup-phone').fill('0900 000 000');
    await f.getByTestId('st-ch-lookup-run').click();
    await expect(f.getByTestId('st-ch-lookup-result')).toHaveAttribute('data-state', 'not_found');

    await f.getByTestId('st-ch-lookup-phone').fill('0912 345 678');
    await f.getByTestId('st-ch-lookup-run').click();
    await expect(f.getByTestId('st-ch-lookup-result')).toHaveAttribute('data-state', 'found');
    await f.getByTestId('st-ch-friend-message').fill('Chào chị');
    page.once('dialog', (d) => void d.accept());
    await f.getByTestId('st-ch-friend-send').click();
    await expect(f.getByTestId('st-ch-friend-undo')).toBeVisible();
    await f.getByTestId('st-ch-friend-undo').click();
    await expect(f.getByTestId('st-ch-friend-send')).toBeVisible();
  });
});
