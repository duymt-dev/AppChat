// TIP-001b AC2 (mock): lỗi giả CHỈ ở chế độ mock (`localStorage.ac_mock_fault`) đi qua đường lỗi render thật của React.
//   - Route: lỗi ở trang Tổng quan → error boundary của nhóm (app) hiện trạng thái lỗi + Thử lại; khung app (rail) vẫn còn; Thử lại sau
//     khi gỡ lỗi → trang hiện lại. Không lộ message / stack.
//   - Panel: lỗi ở Hồ sơ 360° → chỉ panel hiện lỗi, danh sách hội thoại + khung chat vẫn dùng được.
//   - Drawer tải lười (§3.1): lỗi trong drawer AI Báo giá → khung lỗi có Thử lại + Đóng, màn Báo giá vẫn còn; Đóng → mở lại được.
// Mobile 390: trạng thái lỗi route không tràn ngang.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = 'session=authed,declared,trialSeen';
const fault = (page: Page, at: string | null) =>
  page.evaluate((v) => (v ? localStorage.setItem('ac_mock_fault', v) : localStorage.removeItem('ac_mock_fault')), at);

test.describe('error boundary (TIP-001b)', () => {
  test('lỗi route → trạng thái lỗi + Thử lại, khung app còn; Thử lại sau khi hết lỗi → trang hiện lại', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', (m) => m.type() === 'error' && logs.push(m.text()));
    await page.goto(`/dashboard?${S}`);
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await fault(page, 'route:dashboard');
    await page.reload();
    const err = page.getByTestId('route-error');
    await expect(err).toBeVisible();
    await expect(err).toHaveAttribute('data-scope', 'app');
    await expect(err).toContainText('Đã có lỗi xảy ra');
    await expect(err).not.toContainText('mock fault');
    await expect(page.getByTestId('dashboard')).toHaveCount(0);
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    else await expect(page.getByTestId('app-shell')).toBeVisible();
    // Logger của app chỉ ghi phạm vi + tên lỗi (không message); dòng React tự log lỗi đã bắt không thuộc logger.
    const ours = logs.filter((l) => l.includes('[appchat:error]'));
    expect(ours.length).toBeGreaterThan(0);
    expect(ours.join('\n')).not.toContain('mock fault');

    await fault(page, null);
    await err.getByRole('button', { name: 'Thử lại' }).click();
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expect(page.getByTestId('route-error')).toHaveCount(0);
  });

  test('lỗi panel Hồ sơ 360° → chỉ panel hiện lỗi, hộp thư vẫn dùng được', async ({ page }) => {
    test.skip(isMobile(page), '390: hồ sơ 360° là drawer riêng — luồng desktop');
    await page.goto(`/inbox?${S}`);
    await expect(page.getByTestId('panel-360')).toBeVisible();
    await fault(page, 'panel:p360');
    await page.reload();
    const err = page.getByTestId('panel-error');
    await expect(err).toBeVisible();
    await expect(err).toHaveAttribute('data-panel', 'p360');
    await expect(page.getByTestId('panel-360')).toHaveCount(0);
    await expect(page.getByTestId('route-error')).toHaveCount(0);
    await expect(page.getByTestId('app-shell')).toBeVisible();
    await expect(page.getByTestId('conv-row').first()).toBeVisible();

    await fault(page, null);
    await err.getByRole('button', { name: 'Thử lại' }).click();
    await expect(page.getByTestId('panel-360')).toBeVisible();
  });

  test('drawer tải lười lỗi → khung lỗi (Thử lại / Đóng), màn còn; Đóng rồi mở lại được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/quotes?${S}`);
    await expect(page.getByTestId('quotes')).toBeVisible();
    await fault(page, 'panel:quote-ai');
    await page.getByTestId('q-ai-open').click();
    const err = page.getByTestId('panel-error');
    await expect(err).toHaveAttribute('data-panel', 'quote-ai');
    await expect(page.getByTestId('quotes')).toBeVisible();
    await err.getByTestId('panel-error-close').click();
    await expect(page.getByTestId('panel-error')).toHaveCount(0);

    await fault(page, null);
    await page.getByTestId('q-ai-open').click();
    await expect(page.getByTestId('q-ai')).toBeVisible();
    await expect(page.getByTestId('panel-error')).toHaveCount(0);
  });
});
