// TIP-019c P3 — E2E chế độ mock: 4 kỹ năng tiện ích AI chỉ đọc cho người dùng. Trợ lý: nút ⚡ mở menu kỹ năng, `/ai.summarize` + Enter mở
// form (không gửi lượt chat), lệnh lạ vẫn là chữ; chữ dán đánh dấu chưa xác minh; kết quả có khuôn + trích dẫn, không JSON thô. Hộp thư:
// menu ＋ có khối "Kỹ năng AI cho bạn" tách khỏi quyền agent; đóng menu không mất form; chọn tin → tóm tắt trích đúng tin; đổi hội thoại →
// form đóng, không lộ kết quả cũ. Lỗi: kết quả sai → trạng thái riêng, không có nút sao chép. Mobile 390: không tràn ngang.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';

const openInbox = async (page: Page, conv = 'c_lan') => {
  await page.goto(`/inbox${Q}`);
  await page.locator(`[data-conv="${conv}"] button`).first().click();
  await expect(page.getByTestId('composer-input')).toBeVisible();
};

test.describe('kỹ năng tiện ích AI (mock)', () => {
  test('Trợ lý: ⚡ → menu 4 kỹ năng; /ai.summarize mở form, lệnh lạ là chữ; chữ dán → kết quả có trích dẫn', async ({ page }) => {
    await page.goto(`/assistant${Q}`);
    const box = page.getByRole('textbox', { name: 'Hỏi AppChat…' });
    await page.getByTestId('asst-quick').click();
    await expect(page.getByTestId('utility-menu').locator('button')).toHaveCount(4);
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);

    await box.fill('/ai.khong_co');
    await box.press('Enter');
    await expect(page.getByTestId('utility-form-ai.summarize')).toHaveCount(0);

    await box.fill('/ai.summarize');
    await box.press('Enter');
    const form = page.getByTestId('utility-form-ai.summarize');
    await expect(form).toBeVisible();
    await expect(box).toHaveValue('');
    await expect(form.getByTestId('utility-run')).toBeDisabled();
    await form.getByTestId('utility-text').fill('Khách hỏi giá gói 10 buổi, muốn đặt lịch thứ bảy.');
    await expect(form).toContainText('chưa được xác minh');
    await form.getByTestId('utility-run').click();
    await expect(form.getByTestId('utility-state-completed')).toBeVisible();
    await expect(form.getByTestId('utility-evidence').first()).toContainText('Khách hỏi giá');
    await expect(form.getByTestId('utility-state-completed')).not.toContainText('chunk_id');
    if (isMobile(page)) await expectNoHorizontalOverflow(page);
    await form.getByTestId('utility-close').click();
    await expect(form).toHaveCount(0);
  });

  test('Trợ lý: kết quả không hợp lệ → trạng thái sai, không kết quả / sao chép', async ({ page }) => {
    await page.goto(`/assistant${Q}`);
    await page.getByTestId('asst-quick').click();
    await page.getByTestId('utility-pick-ai.detect_intent').click();
    const form = page.getByTestId('utility-form-ai.detect_intent');
    await form.getByTestId('utility-text').fill('__fail__ nội dung');
    await form.getByTestId('utility-run').click();
    await expect(form.getByTestId('utility-state-failed')).toBeVisible();
    await expect(form.getByTestId('utility-copy')).toHaveCount(0);
  });

  test('Hộp thư: menu ＋ tách kỹ năng của bạn / quyền agent; form sống qua đóng menu; tin chọn → trích đúng tin; đổi hội thoại → đóng', async ({ page }) => {
    await openInbox(page);
    await page.getByRole('button', { name: 'Thêm tệp, kết nối, plugin' }).click();
    const pop = page.getByTestId('attach-pop');
    await expect(pop.getByTestId('utility-menu')).toContainText('Kỹ năng AI cho bạn');
    await pop.getByTestId('utility-pick-ai.summarize').click();
    await expect(pop).toHaveCount(0);
    const form = page.getByTestId('utility-form-ai.summarize');
    await expect(form).toBeVisible();
    await form.getByTestId('utility-msg-m3').check();
    await form.getByTestId('utility-run').click();
    await expect(form.getByTestId('utility-evidence').first()).toContainText('Em ơi');
    if (isMobile(page)) await expectNoHorizontalOverflow(page);

    if (isMobile(page)) await page.getByRole('button', { name: 'Quay lại danh sách' }).click();
    await page.locator('[data-conv]:not([data-conv="c_lan"]) button').first().click();
    await expect(page.getByTestId('utility-form-ai.summarize')).toHaveCount(0);
  });

  test('Hộp thư: đánh giá cơ hội chỉ khi có khách; trích thông tin từ tin chọn', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await openInbox(page);
    await page.getByRole('button', { name: 'Thêm tệp, kết nối, plugin' }).click();
    await page.getByTestId('utility-pick-ai.score_lead').click();
    const lead = page.getByTestId('utility-form-ai.score_lead');
    await lead.getByTestId('utility-run').click();
    await expect(lead.getByTestId('utility-lead')).toContainText('Chưa đủ bằng chứng');
    await lead.getByTestId('utility-msg-m3').check();
    await lead.getByTestId('utility-run').click();
    await expect(lead.getByTestId('utility-lead')).toContainText('60/100');
    await lead.getByTestId('utility-close').click();

    await page.getByRole('button', { name: 'Thêm tệp, kết nối, plugin' }).click();
    await page.getByTestId('utility-pick-ai.extract_info').click();
    const ex = page.getByTestId('utility-form-ai.extract_info');
    await expect(ex.getByTestId('utility-fields')).toBeVisible();
    await ex.getByTestId('utility-msg-m3').check();
    await ex.getByTestId('utility-run').click();
    await expect(ex.getByTestId('utility-extract')).toBeVisible();
  });
});
