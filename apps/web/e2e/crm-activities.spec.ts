// TIP-026b P2 — E2E chế độ mock: Hồ sơ 360° ở Hộp thư (màn Khách hàng không mở) dùng hoạt động CRM thật — thêm ghi chú (thay "ghi chú
// gần nhất"), bình luận nhanh, tạo việc rồi đánh dấu xong, cập nhật cơ hội. "Tạo báo giá" từ cơ hội chỉ mở form báo giá (không điền giá).
// Mobile 390: mở hồ sơ, thẻ hoạt động không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/inbox?session=authed,declared,trialSeen';

test.describe('hoạt động CRM ở Hồ sơ 360° (mock)', () => {
  test('ghi chú + bình luận + việc + cơ hội', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(URL);
    await page.locator('[data-conv="c_lan"] button').first().click();
    await expect(page.getByTestId('p360-opportunity')).toContainText('Liệu trình HIFU + Combo da');

    await page.getByTestId('note-add').click();
    await page.getByTestId('activity-body').fill('Khách muốn đổi lịch sang tối thứ 6');
    await page.getByTestId('activity-save').click();
    await expect(page.getByTestId('activity-note-form')).toHaveCount(0);
    await expect(page.getByTestId('p360-note')).toContainText('Khách muốn đổi lịch sang tối thứ 6');

    await page.getByTestId('comment-input').fill('Anh Minh gọi giúp em');
    await page.getByTestId('comment-send').click();
    await expect(page.getByTestId('p360-comments')).toContainText('Anh Minh gọi giúp em');

    await page.getByTestId('task-add').click();
    await page.getByTestId('task-title').fill('Gửi case study');
    await page.getByTestId('activity-save').click();
    const row = page.getByTestId('p360-tasks').locator('[data-task]', { hasText: 'Gửi case study' });
    await expect(row).toBeVisible();
    await row.getByTestId('task-check').click();
    await expect(row.getByTestId('task-check')).toHaveAttribute('aria-checked', 'true');

    await page.getByTestId('opp-edit').click();
    await page.getByTestId('opp-prob').fill('80');
    await page.getByTestId('activity-save').click();
    await expect(page.getByTestId('p360-opportunity')).toContainText('80%');

    await page.getByTestId('opp-edit').click();
    await page.getByTestId('opp-to-quote').click();
    await expect(page.getByTestId('q-form')).toBeVisible();
  });

  test('mobile: thẻ hoạt động không tràn ngang', async ({ page }) => {
    test.skip(!isMobile(page), 'luồng mobile');
    await page.goto(URL);
    await page.locator('[data-conv="c_lan"] button').first().click();
    await page.getByRole('button', { name: 'Thu gọn hồ sơ' }).click();
    await expect(page.getByTestId('p360-tasks')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
