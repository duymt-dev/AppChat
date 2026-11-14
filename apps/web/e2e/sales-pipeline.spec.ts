// TIP-026c — E2E mock: Cơ hội / Sales Pipeline. Hộp thư (chị Lan): chip cơ hội ở dòng + đầu hội thoại, thẻ 360° Tư vấn / Demo 50% · dự
// báo ≈ 24tr, Áp dụng gợi ý AI → Báo giá 70%, thêm nhanh vào Lead mới, drawer Cơ hội 360° (chuỗi chứng từ, Đánh dấu Thua bắt buộc lý do,
// Mở lại → Đủ điều kiện). Khách hàng: cột "Cơ hội đang mở" mở drawer; báo giá đã gửi + Thua → báo giá bị từ chối. Form báo giá: "Thuộc cơ
// hội" + cảnh báo không gắn. Mobile 390: drawer toàn màn, không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const INBOX = '/inbox?session=authed,declared,trialSeen';
const CUSTOMERS = '/customers?session=authed,declared,trialSeen';

test.describe('Cơ hội / Sales Pipeline (mock)', () => {
  test('Hộp thư: chip + thẻ 360° + gợi ý AI + thêm nhanh', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(INBOX);
    await expect(page.locator('[data-conv="c_lan"]').getByTestId('conv-opp-chip')).toContainText('Cơ hội · 48tr');
    await page.locator('[data-conv="c_lan"] button').first().click();
    await expect(page.getByTestId('chat-opp-chip')).toContainText('Cơ hội · Tư vấn / Demo · 48tr');
    const card = page.getByTestId('p360-opportunity');
    await expect(card).toContainText('Liệu trình HIFU + Combo da');
    await expect(card.getByTestId('opp-prob')).toHaveText('50%');
    await expect(card.getByTestId('opp-forecast')).toContainText('24');
    await expect(card.getByTestId('opp-next')).toContainText('Gửi báo giá');
    await expect(card).not.toContainText('Pipeline Bán lẻ');

    await card.getByTestId('opp-ai-apply').click();
    await expect(card.getByTestId('opp-stage')).toHaveText('Báo giá');
    await expect(card.getByTestId('opp-prob')).toHaveText('70%');
    await expect(card.getByTestId('opp-ai')).toHaveCount(0);

    await card.getByTestId('opp-add').click();
    await card.getByTestId('opp-new-name').fill('Gói triệt lông 2026');
    await card.getByTestId('opp-new-value').fill('18');
    await card.getByTestId('opp-new-save').click();
    await expect(card.getByTestId('opp-history')).toContainText('Gói triệt lông 2026');
    await expect(card.getByTestId('opp-history')).toContainText('Lead mới');
  });

  test('drawer: Thua bắt buộc lý do → báo giá đã gửi bị từ chối; Mở lại → Đủ điều kiện', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(CUSTOMERS);
    const cell = page.getByTestId('crm-opp-kh_1002');
    await expect(cell).toContainText('85tr');
    await expect(cell).toContainText('Báo giá');
    await cell.click();
    const drawer = page.getByTestId('opp-drawer');
    await expect(drawer.getByTestId('opp-drawer-name')).toHaveText('Gói AI CSKH 12 tháng');
    await expect(drawer.getByTestId('opp-chain-1')).toContainText('BG-0398');
    await expect(drawer).toContainText('Đề nghị thanh toán');
    await expect(drawer).not.toContainText('Hóa đơn');
    await expect(drawer.getByTestId('opp-chain-accept')).toHaveText('Khách chốt');

    await drawer.getByTestId('opp-lose').click();
    await expect(drawer.getByTestId('opp-lost-picker')).toBeVisible();
    await drawer.getByTestId('opp-lost-price').click();
    await expect(drawer.getByTestId('opp-lost-box')).toContainText('Giá cao');
    await expect(drawer.getByTestId('opp-chain-1')).toContainText('Từ chối');

    await drawer.getByTestId('opp-reopen').click();
    await expect(drawer.getByTestId('opp-drawer-stage')).toHaveText('Đủ điều kiện');
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
  });

  test('form báo giá từ cơ hội: "Thuộc cơ hội" điền sẵn; bỏ gắn → cảnh báo pipeline', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(CUSTOMERS);
    await page.getByTestId('crm-opp-kh_1004').click();
    await page.getByTestId('opp-drawer').getByTestId('opp-chain-new-quote').click();
    const form = page.getByTestId('q-form');
    await expect(form.getByTestId('opp-picker-select')).toHaveValue('op_1004_1');
    await expect(form.getByTestId('opp-flag-sync')).toBeChecked();
    await expect(form.getByTestId('opp-flag-follow')).toBeChecked();
    await form.getByTestId('opp-picker-select').selectOption('');
    await expect(form.getByTestId('opp-picker-warn')).toContainText('không được tính vào pipeline');
  });

  test('mobile 390: drawer cơ hội toàn màn, không tràn ngang', async ({ page }) => {
    test.skip(!isMobile(page), 'luồng mobile');
    await page.goto(INBOX);
    await page.locator('[data-conv="c_lan"] button').first().click();
    await page.getByRole('button', { name: 'Thu gọn hồ sơ' }).click();
    await page.getByTestId('opp-open').click();
    await expect(page.getByTestId('opp-drawer-name')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
