import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

test.describe('dashboard', () => {
  test('checklist: đánh dấu bước, thu gọn / mở rộng', async ({ page }) => {
    await page.goto('/dashboard?session=authed,declared,trialSeen');
    const list = page.getByTestId('onb-checklist');
    await expect(list).toContainText('0/5 hoàn tất');
    await page.getByTestId('onb-step-channel').getByRole('button', { name: 'Đánh dấu bước' }).click();
    await expect(list).toContainText('1/5 hoàn tất');
    await expect(page.getByTestId('onb-step-channel')).toContainText('Mở lại');
    await list.getByRole('button', { name: 'Thu gọn' }).click();
    await expect(page.getByTestId('onb-checklist-mini')).toContainText('1/5 bước · 20% hoàn tất');
  });

  test('thẻ module ẩn mục OUT; trung tâm cập nhật follow xong + tab', async ({ page }) => {
    await page.goto('/dashboard?session=authed,declared,trialSeen');
    await expect(page.getByTestId('dashboard')).not.toContainText('Gọi điện');
    await expect(page.getByTestId('dashboard')).not.toContainText('Quy trình');
    const w = page.getByTestId('updates-widget');
    await expect(w.getByTestId('follow-row')).toHaveCount(2);
    await w.getByRole('button', { name: 'Mở tất cả →' }).click();
    await expect(w.getByTestId('follow-row')).toHaveCount(5);
    await w.getByTestId('follow-row').first().getByRole('button', { name: 'Đã follow' }).click();
    await expect(w).toContainText('7 khách đến hạn');
    await w.getByRole('button', { name: /Tin tức/ }).click();
    await expect(w).toContainText('AI Voice Agent đã ra mắt');
    await w.getByRole('button', { name: 'Thu nhỏ' }).click();
    await expect(page.getByTestId('updates-pill')).toBeVisible();
  });

  test('Việc cần tôi: mở đúng màn; gia hạn hợp đồng → Trợ lý soạn nháp (không tự gửi); Credit chỉ Owner', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto('/dashboard?session=authed,declared,trialSeen');
    const work = page.getByTestId('dash-my-work');
    await expect(work.locator('[data-work]')).toHaveCount(4);
    await expect(page.getByTestId('dash-ai-today')).toContainText('128');
    await expect(page.getByTestId('dash-credit')).toContainText('8.420');
    await work.locator('[data-work="contract_renewal"]').getByRole('button', { name: 'Nhờ Trợ lý soạn gia hạn' }).click();
    await expect(page).toHaveURL(/\/assistant/);
    await page.goto('/dashboard?session=authed,declared,trialSeen');
    await page.getByTestId('dev-toolbar').locator('.ant-select').click();
    await page.locator('.ant-select-item-option', { hasText: 'Kế toán' }).click();
    await expect(page.getByTestId('dash-credit')).toHaveCount(0);
    await expect(page.getByTestId('dash-ai-today')).toContainText('—');
  });

  test('vai trò Kế toán: không thấy nút Kết nối kênh', async ({ page }) => {
    test.skip(isMobile(page), 'dev toolbar chỉ thao tác trên desktop');
    await page.goto('/dashboard?session=authed,declared,trialSeen');
    await expect(page.getByTestId('dash-connect').getByRole('button', { name: /Kết nối/ }).first()).toBeVisible();
    await page.getByTestId('dev-toolbar').locator('.ant-select').click();
    await page.locator('.ant-select-item-option', { hasText: 'Kế toán' }).click();
    await expect(page.getByTestId('dash-connect').getByRole('button', { name: /Kết nối/ })).toHaveCount(0);
  });

  test('390: không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto('/dashboard?session=authed,declared,trialSeen');
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('onb-checklist').getByRole('button', { name: /Kết nối kênh|Thu gọn/ }));
    await expectTouchTargets(page.getByTestId('updates-widget').getByRole('button', { name: /Thu nhỏ|Đã follow/ }));
  });
});
