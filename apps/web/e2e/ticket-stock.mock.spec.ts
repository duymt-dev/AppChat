// TIP-034d AC7 (mock): thẻ KPI Ticket có huy hiệu "so với hôm qua" (dấu + lời đọc, không lồng nút), chi tiết là nút riêng ngoài thẻ; bấm
// thẻ vẫn lọc như cũ; kịch bản mock `ac_mock_stock` — có mốc / chưa có mốc / backend cũ / nguồn mất — không bao giờ số 0 giả; meta đọc lại
// mỗi 60 giây khi tab đang hiện (sang ngày mới thấy không cần F5) và khi quay lại tab; mobile 390 không tràn ngang. Mock KHÔNG phải bằng
// chứng mốc lịch sử thật (native ở http/ticket-stock.spec.ts + integration).
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/tickets?session=authed,declared,trialSeen';
const scenario = (page: Page, v: string | null) =>
  page.addInitScript((x) => (x ? localStorage.setItem('ac_mock_stock', x) : localStorage.removeItem('ac_mock_stock')), v);

test.describe('ticket stock (mock)', () => {
  test('có mốc: dấu từng thẻ + lời đọc; không nút lồng nút; chi tiết riêng; bấm thẻ vẫn lọc', async ({ page }) => {
    await scenario(page, null);
    await page.goto(URL);
    const kpis = page.getByTestId('tk-kpis');
    await expect(page.getByTestId('tk-trend-breach')).toHaveAttribute('data-sign', 'up');
    await expect(page.getByTestId('tk-trend-breach')).toContainText('tăng 1 so với hôm qua');
    await expect(page.getByTestId('tk-trend-open')).toHaveAttribute('data-sign', 'down');
    await expect(page.getByTestId('tk-trend-waiting')).toHaveAttribute('data-sign', 'flat');
    await expect(kpis.locator('button button, button [role="button"], button a')).toHaveCount(0);
    await expect(kpis.getByTestId('tk-stock-details')).toHaveCount(0);
    const details = page.getByTestId('tk-stock-details');
    await expect(details).toContainText('So với hôm qua lúc 09:15 23/06');
    await details.focus();
    await page.keyboard.press('Enter');
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('tk-stock-panel')).toContainText('không phải tăng trưởng ròng');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('tk-stock-panel')).toHaveCount(0);
    if (!isMobile(page)) {
      await page.getByTestId('tk-kpi-breach').click();
      await expect(page.locator('[data-ticket]')).toHaveCount(1);
      await page.getByTestId('tk-kpi-total').click();
      await expect(page.locator('[data-ticket]')).toHaveCount(14);
    }
  });

  test('chưa có mốc / backend cũ / nguồn mất → "—" + lý do, không số 0 giả', async ({ page }) => {
    for (const [v, short, reason] of [
      ['missing', 'Chưa có số hôm qua để so', 'Chưa có lần quan sát nào của hôm qua'],
      ['scope_lost', 'Chưa có số hôm qua để so', 'Một phần dữ liệu hôm qua không còn được dùng'],
      ['legacy', 'Chưa rõ xu hướng', 'Máy chủ chưa hỗ trợ so sánh với hôm qua'],
    ] as const) {
      await page.goto(URL);
      await page.evaluate((x) => localStorage.setItem('ac_mock_stock', x), v);
      await page.reload();
      for (const k of ['total', 'open', 'waiting', 'breach', 'closed']) await expect(page.getByTestId(`tk-trend-${k}`)).toHaveAttribute('data-sign', 'unknown');
      await expect(page.getByTestId('tk-trend-total')).toContainText('chưa so được với hôm qua');
      await expect(page.getByTestId('tk-stock-details')).toContainText(short);
      await page.getByTestId('tk-stock-details').click();
      await expect(page.getByTestId('tk-stock-panel')).toContainText(reason);
      await expect(page.locator('[data-testid^="tk-stock-row-"]')).toHaveCount(0);
    }
    await page.evaluate(() => localStorage.removeItem('ac_mock_stock'));
  });

  test('meta đọc lại mỗi 60 giây khi tab hiện (qua nửa đêm không cần F5) và khi quay lại tab', async ({ page }) => {
    test.skip(isMobile(page), 'một lần là đủ');
    await page.clock.install({ time: new Date('2026-06-24T23:59:00+07:00') });
    await scenario(page, null);
    await page.goto(URL);
    await expect(page.getByTestId('tk-trend-total')).toHaveAttribute('data-sign', 'up');
    // Sang ngày mới: mốc hôm qua không còn (mock đổi kịch bản như server khi chưa chụp ngày mới).
    await page.evaluate(() => localStorage.setItem('ac_mock_stock', 'missing'));
    await page.clock.runFor(61_000);
    await expect(page.getByTestId('tk-trend-total')).toHaveAttribute('data-sign', 'unknown');
    // Quay lại tab: đọc lại ngay.
    await page.evaluate(() => localStorage.removeItem('ac_mock_stock'));
    await page.clock.runFor(31_000);
    // focusManager của TanStack Query v5 nghe `visibilitychange` trên window (tab hiện lại = refocus).
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
    await page.clock.runFor(2_000);
    await expect(page.getByTestId('tk-trend-total')).toHaveAttribute('data-sign', 'up');
  });

  test('mobile 390: không tràn ngang, nút chi tiết đủ vùng chạm', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await scenario(page, null);
    await page.goto(URL);
    await expect(page.getByTestId('tk-trend-total')).toBeVisible();
    await page.getByTestId('tk-stock-details').click();
    await expect(page.getByTestId('tk-stock-panel')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expect((await page.getByTestId('tk-stock-details').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
