// TIP-043 — E2E mock: hàng chờ "AI đã học — chờ duyệt" trong Dữ liệu RAG. Mở từ link thông báo (?nav=review) → số chờ duyệt; mở đề xuất,
// sửa đáp án còn SĐT → báo dưới ô (form giữ nguyên); xoá SĐT, chọn thư mục → Duyệt → mất khỏi Chờ duyệt, sang Đã duyệt "Đã học", tài liệu
// "Từ hội thoại" xuất hiện; Từ chối kèm lý do → tab Đã từ chối; bàn phím (Tab / Enter mở đề xuất, Esc đóng drawer); en; 390 không tràn.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const URL = '/settings/rag_data?session=authed,declared,trialSeen&nav=review';

test.describe('kb-suggestions', () => {
  test('sửa → còn SĐT bị chặn → duyệt vào thư mục; từ chối kèm lý do; không nhãn "Đã học" trước khi duyệt', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const panel = page.getByTestId('st-kbsug');
    await expect(panel).toBeVisible();
    await expect(page.getByTestId('st-rag-nav-review')).toContainText('3');
    await expect(panel.locator('[data-sug]')).toHaveCount(3);
    await expect(panel.getByTestId('st-kbsug-chip').first()).toHaveText('Chờ duyệt');

    await panel.locator('[data-sug="sg_1"]').click();
    const d = page.getByTestId('st-kbsug-drawer');
    await d.getByTestId('st-kbsug-answer').fill('Đổi trước 24 giờ, gọi 0909123456 để hỗ trợ.');
    await d.getByTestId('st-kbsug-approve').click();
    await expect(d.getByRole('alert')).toContainText('số điện thoại');
    await expect(d).toBeVisible();
    await d.getByTestId('st-kbsug-answer').fill('Đổi lịch trước 24 giờ, miễn phí, tối đa 2 lần.');
    await expect(d.getByTestId('st-kbsug-original')).toBeVisible();
    await d.getByTestId('st-kbsug-folder').selectOption({ label: 'Bảng giá' });
    await d.getByTestId('st-kbsug-approve').click();
    await expect(d).toHaveCount(0);
    await expect(panel.locator('[data-sug="sg_1"]')).toHaveCount(0);
    await expect(page.getByTestId('st-rag-nav-review')).toContainText('2');

    await panel.locator('[data-sug="sg_2"]').click();
    await d.getByTestId('st-kbsug-reason').fill('Thông tin đã cũ');
    await d.getByTestId('st-kbsug-reject').click();
    await expect(d).toHaveCount(0);

    await panel.getByTestId('st-kbsug-tab-approved').click();
    await expect(panel.locator('[data-sug="sg_1"]')).toContainText('tối đa 2 lần');
    await expect(panel.locator('[data-sug="sg_1"]').getByTestId('st-kbsug-chip')).toHaveText('Đã học');
    await panel.getByTestId('st-kbsug-tab-rejected').click();
    await expect(panel.locator('[data-sug="sg_2"]')).toBeVisible();

    await page.getByTestId('st-rag-nav-conv').click();
    await expect(page.locator('[data-doc]').filter({ hasText: 'Khách có được đổi lịch hẹn không?' })).toBeVisible();
  });

  test('bàn phím: Tab tới đề xuất, Enter mở, Esc đóng', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    const first = page.locator('[data-sug="sg_1"]');
    await first.focus();
    await page.keyboard.press('Enter');
    const d = page.getByTestId('st-kbsug-drawer');
    await expect(d).toBeVisible();
    await expect(d.getByTestId('st-kbsug-question')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(d).toHaveCount(0);
  });

  test('tiếng Anh', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: page.url() === 'about:blank' ? (test.info().project.use.baseURL ?? 'http://localhost:3419') : page.url() }]);
    await page.goto(URL);
    await expect(page.getByTestId('st-rag-nav-review')).toContainText('To review');
    await expect(page.getByTestId('st-kbsug-tab-pending')).toHaveText('To review');
  });

  test('390: hàng chờ + drawer không tràn ngang, nút chạm đủ lớn', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(URL);
    await expect(page.getByTestId('st-kbsug')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.locator('[data-sug]'));
    await page.locator('[data-sug="sg_1"]').click();
    const d = page.getByTestId('st-kbsug-drawer');
    await expect(d).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(d.getByTestId('st-kbsug-approve'));
    await expectTouchTargets(d.getByTestId('st-kbsug-reject'));
  });
});
