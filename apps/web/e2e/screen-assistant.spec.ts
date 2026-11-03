// Trợ lý theo màn (TIP-023c G2, mock): drawer Khách hàng gửi lượt THẬT kèm ngữ cảnh màn → cây GenUI gọn (compact) trong drawer; nút ui
// lọc bảng / tô sáng đúng dòng; nút action do Trợ lý đề nghị → thẻ xem trước; "Mở trong Trợ lý" nạp lại cùng phiên (không gọi model).
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const URL = '/customers?session=authed,declared,trialSeen';

const openDrawer = async (page: Page) => {
  await page.goto(URL);
  await expect(page.locator('[data-contact]').first()).toBeVisible();
  await page.getByTestId('crm-ai').click();
  return page.getByTestId('crm-ai-drawer');
};

test.describe('screen-assistant', () => {
  test('nút nhanh → cây compact; lọc bảng; tô sáng dòng; Mở trong Trợ lý cùng phiên', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    const drawer = await openDrawer(page);
    await drawer.getByTestId('crm-ai-run-churn').click();
    const ui = drawer.getByTestId('genui');
    await expect(ui).toHaveAttribute('data-mode', 'compact');
    await expect(ui.getByTestId('genui-stat')).toContainText('37');
    // compact: danh sách 6 khách → 5 dòng + "Mở rộng"
    await expect(ui.getByTestId('genui-expand')).toBeVisible();
    await ui.getByRole('button', { name: 'Tô sáng chị Lan' }).click();
    await expect(page.locator('[data-contact="ct_lan"][data-highlighted="true"]')).toBeVisible();
    await ui.getByRole('button', { name: 'Lọc trên bảng' }).click();
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
    await expect(page.locator('[data-contact]')).toHaveCount(4);
    await drawer.getByTestId('crm-ai-full').click();
    await expect(page).toHaveURL(/\/assistant$/);
    const full = page.getByTestId('genui');
    await expect(full).toHaveAttribute('data-mode', 'full');
    await expect(full.getByTestId('genui-stat')).toContainText('37');
    await expect(page.getByText('Tìm khách có nguy cơ rời bỏ', { exact: false }).first()).toBeVisible();
  });

  test('nút action trong drawer → thẻ xem trước (không chạy thẳng)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    const drawer = await openDrawer(page);
    await drawer.getByTestId('crm-ai-run-dedupe').click();
    await expect(drawer.getByTestId('genui-table').locator('tbody tr')).toHaveCount(3);
    await drawer.getByRole('button', { name: 'Gắn thẻ VIP cho chị Lan' }).click();
    const preview = page.getByRole('dialog', { name: 'Xác nhận thao tác' });
    await expect(preview).toBeVisible();
    await preview.getByRole('button', { name: 'Huỷ' }).click();
    await expect(preview).toBeHidden();
  });

  // Mỗi drawer theo màn: nút nhanh → lượt thật → cây compact; nút ui lọc bảng của màn; "Mở trong Trợ lý" cùng phiên.
  const DRAWERS = [
    { m: 'quotes', open: 'q-ai-open', drawer: 'q-ai', run: 'q-ai-followup', text: 'BG-2040' },
    { m: 'contracts', open: 'ct-ai-open', drawer: 'ct-ai', run: 'ct-ai-risk', text: 'HĐ-1178' },
    { m: 'orders', open: 'od-ai-open', drawer: 'od-ai', run: 'od-ai-collect', text: 'DH-290411' },
    { m: 'calendar', open: 'cal-ai-open', drawer: 'cal-ai', run: 'cal-ai-report', text: 'Doanh thu dự kiến' },
    { m: 'tickets', open: 'tk-ai-open', drawer: 'tk-ai', run: 'tk-ai-route', text: 'TKT-2040' },
  ];
  for (const d of DRAWERS)
    test(`${d.m}: nút nhanh → cây compact trong drawer, Mở trong Trợ lý cùng phiên`, async ({ page }) => {
      test.skip(isMobile(page), 'luồng desktop');
      await page.goto(`/${d.m}?session=authed,declared,trialSeen`);
      await page.getByTestId(d.open).click();
      const drawer = page.getByTestId(d.drawer);
      await drawer.getByTestId(d.run).click();
      const ui = drawer.getByTestId('genui');
      await expect(ui).toHaveAttribute('data-mode', 'compact');
      await expect(ui).toContainText(d.text);
      await expect(drawer.getByTestId('screen-ai-user')).toHaveCount(1);
      const full = drawer.getByTestId('screen-ai-open-full').or(drawer.getByTestId(`${d.drawer}-full`));
      await full.first().click();
      await expect(page).toHaveURL(/\/assistant$/);
      await expect(page.getByTestId('genui')).toContainText(d.text);
    });

  test('marketing: ô hỏi gửi lượt thật → cây compact', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto('/marketing?session=authed,declared,trialSeen');
    await page.getByTestId('mk-ai-open').click();
    const drawer = page.getByTestId('mk-ai');
    const box = drawer.getByRole('textbox');
    await box.fill('Chiến dịch nào đang tạm dừng?');
    await box.press('Enter');
    await expect(drawer.getByTestId('genui')).toContainText('Win-back khách ngủ đông');
  });

  test('mobile: drawer không tràn ngang khi có cây', async ({ page }) => {
    test.skip(!isMobile(page), 'mobile');
    const drawer = await openDrawer(page);
    await drawer.getByTestId('crm-ai-run-pipeline').click();
    await expect(drawer.getByTestId('genui')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
