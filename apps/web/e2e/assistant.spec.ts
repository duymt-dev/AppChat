import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';

const setRole = async (page: Page, label: string) => {
  await page.getByTestId('dev-toolbar').locator('.ant-select').click();
  await page.locator('.ant-select-item-option', { hasText: label }).click();
};

const ask = async (page: Page, text: string) => {
  const box = page.getByTestId('asst-composer').locator('textarea');
  await box.fill(text);
  await box.press('Enter');
};

test.describe('assistant', () => {
  test('chat: thẻ xác nhận → đã lưu, huỷ, trả lời thường; nhật ký có dòng mới', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant${Q}`);
    await expect(page.getByTestId('asst-think-cards').locator('button')).toHaveCount(4);
    await ask(page, 'Tạo báo giá cho chị Lan');
    await expect(page.getByTestId('asst-card')).toHaveAttribute('data-status', 'pending');
    await page.getByRole('button', { name: 'Xác nhận & lưu' }).click();
    await expect(page.getByTestId('asst-card')).toContainText('Đã lưu vào Báo giá');
    await ask(page, 'tạo ticket nhắc việc cho Minh');
    await page.getByTestId('asst-card').nth(1).getByRole('button', { name: 'Huỷ' }).click();
    await expect(page.getByTestId('asst-card').nth(1)).toContainText('AppChat không thực thi');
    await ask(page, 'Tóm tắt tình hình kinh doanh hôm nay');
    await expect(page.getByTestId('asst-ai-msg').last()).toContainText('177 hội thoại');
    await page.getByTestId('asst-new-chat').click();
    await expect(page.getByTestId('asst-welcome')).toBeVisible();
    // điều hướng trong app (giữ store mock) qua flyout Trợ lý trên rail
    await page.locator('[data-nav="assistant"]').hover();
    await page.getByTestId('flyout-assistant').getByText('Nhật ký hành động').click();
    await expect(page.locator('[data-log]').first()).toContainText('Báo giá do AppChat AI soạn');
  });

  test('composer: menu +, chọn mức AI (không tên model — D29), Cowork chọn agent', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant${Q}`);
    await page.getByTestId('asst-plus').click();
    await expect(page.getByTestId('asst-pop-plus')).toContainText('Thêm tệp hoặc hình ảnh');
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await page.getByTestId('asst-tier').click();
    await expect(page.getByTestId('asst-pop-tier')).not.toContainText(/Sonnet|Haiku|Opus|Claude/);
    await page.getByRole('menuitemradio', { name: /Tối đa/ }).click();
    await expect(page.getByTestId('asst-tier')).toContainText('Tối đa');
    await page.getByRole('radio', { name: 'Cowork' }).click();
    await expect(page.getByTestId('asst-agent-cards')).not.toContainText(/Sonnet|Haiku|Opus/);
    await page.getByTestId('asst-agent').click();
    await page.getByRole('menuitemradio', { name: 'Booking Agent (AI)' }).click();
    await expect(page.getByTestId('asst-agent')).toContainText('Booking Agent (AI)');
  });

  test('Coworks: tạo tác vụ từ mẫu nhanh, tạm dừng, drawer cấu hình', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant/cowork${Q}`);
    await expect(page.getByTestId('cw-task')).toHaveCount(6);
    await page.getByTestId('cw-create').click();
    await expect(page.getByTestId('cw-save')).toBeDisabled();
    await page.getByRole('button', { name: 'Nhắc công nợ quá hạn' }).click();
    await page.getByTestId('cw-save').click();
    await expect(page.getByTestId('cw-task')).toHaveCount(7);
    const first = page.getByTestId('cw-task').first();
    await expect(first).toContainText('Nhắc công nợ quá hạn');
    await first.getByRole('switch').click();
    await expect(first).toContainText('Tạm dừng');
    await first.click();
    await page.getByTestId('cw-drawer').getByRole('tab', { name: 'Nhật ký & Chi phí' }).click();
    await expect(page.getByTestId('cw-drawer')).toContainText('Token hôm nay');
    await page.getByTestId('cw-drawer-save').click();
    await expect(page.getByTestId('cw-drawer')).toHaveCount(0);
  });

  test('nhật ký: lọc loại / trạng thái, hoàn tác', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/assistant/actions${Q}`);
    await expect(page.locator('[data-log]')).toHaveCount(10);
    await page.getByRole('tab', { name: 'Gửi đi' }).click();
    await expect(page.locator('[data-log]')).toHaveCount(2);
    await page.getByRole('tab', { name: 'Tất cả' }).click();
    await page.locator('[data-log="al_seed_1"]').getByTestId('log-undo').click();
    await expect(page.locator('[data-log="al_seed_1"]').getByTestId('log-status-badge')).toHaveText('Đã hoàn tác');
    await page.getByTestId('log-status').selectOption('undone');
    await expect(page.locator('[data-log]')).toHaveCount(1);
  });

  test('chờ duyệt: Chủ sở hữu duyệt; Quản lý không duyệt được hoàn tiền; Sales không thấy mục', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto(`/assistant/approvals${Q}`);
    await expect(page.getByTestId('ap-card')).toHaveCount(4);
    await page.locator('[data-approval="ap_1"]').getByTestId('ap-approve').click();
    await expect(page.getByTestId('ap-card')).toHaveCount(3);
    await setRole(page, 'Quản lý');
    await expect(page.locator('[data-approval="ap_3"]').getByTestId('ap-approve')).toBeDisabled();
    await expect(page.locator('[data-approval="ap_3"]')).toContainText('không có quyền duyệt');
    await page.locator('[data-approval="ap_2"]').getByTestId('ap-reject').click();
    await expect(page.getByTestId('ap-card')).toHaveCount(2);
    await setRole(page, 'Sales');
    await page.locator('[data-nav="assistant"]').hover();
    await expect(page.getByTestId('flyout-assistant')).not.toContainText('Chờ duyệt');
  });

  test('390: màn chào, hội thoại, Coworks, nhật ký — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(`/assistant${Q}`);
    await expect(page.getByTestId('asst-welcome')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('asst-send'));
    await expectTouchTargets(page.getByTestId('asst-plus'));
    await ask(page, 'Tạo báo giá cho chị Lan');
    await expect(page.getByTestId('asst-card')).toBeVisible();
    await expectTouchTargets(page.getByRole('button', { name: 'Xác nhận & lưu' }));
    await expectNoHorizontalOverflow(page);
    await page.goto(`/assistant/cowork${Q}`);
    await expect(page.getByTestId('cw-task').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('cw-create').click();
    await expectTouchTargets(page.getByTestId('cw-save'));
    await expectNoHorizontalOverflow(page);
    await page.goto(`/assistant/actions${Q}`);
    await expect(page.locator('[data-log]').first()).toBeVisible();
    await expectTouchTargets(page.locator('[data-log="al_seed_1"]').getByTestId('log-undo'));
    await expectNoHorizontalOverflow(page);
    await page.goto(`/assistant/approvals${Q}`);
    await expect(page.getByTestId('ap-card').first()).toBeVisible();
    await expectTouchTargets(page.getByTestId('ap-approve').first());
    await expectNoHorizontalOverflow(page);
  });
});
