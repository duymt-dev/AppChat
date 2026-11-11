// TIP-023g (mock): bảy lối vào Trợ lý theo bản ghi + hai loại dòng lịch (lịch hẹn / follow-up). Bấm ⚡/✦ trên dòng → drawer Trợ lý của
// module gắn ĐÚNG bản ghi (data-record), mở chưa gọi gì; gửi việc → lượt mang record_intent; Bỏ gắn → về Trợ lý theo màn. Tab AI của
// Đề nghị thanh toán / Sản phẩm nhúng khung gắn bản ghi; việc gợi ý chỉ trích vào ô việc (không chạy thẳng); đề xuất combo / chiến dịch
// là thẻ chỉ đọc (món + giá danh mục), không tạo sản phẩm / chiến dịch.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';

const ROWS = [
  { m: 'quotes', row: '[data-quote="q_2039"]', btn: 'Giao AI Agent xử lý ngay', tid: 'q-rai', entity: 'quote', id: 'q_2039' },
  { m: 'contracts', row: '[data-contract="ctr_1182"]', btn: 'Giao AI Agent xử lý ngay', tid: 'ct-rai', entity: 'contract', id: 'ctr_1182' },
  { m: 'orders', row: '[data-order="ord_290409"]', btn: 'Giao AI Agent xử lý ngay', tid: 'od-rai', entity: 'order', id: 'ord_290409' },
  { m: 'tickets', row: '[data-ticket="tk_2041"]', btn: 'Xem gợi ý AI', tid: 'tk-rai', entity: 'ticket', id: 'tk_2041' },
  { m: 'calendar', row: '[data-appt="ap_1215"]', btn: 'Xem gợi ý AI', tid: 'cal-rai', entity: 'appointment', id: 'ap_1215', list: true },
  { m: 'calendar', row: '[data-follow="cfu_1"]', btn: 'Xem gợi ý AI', tid: 'cal-rai', entity: 'follow_up', id: 'cfu_1', list: true },
];

test.describe('record-ai', () => {
  for (const r of ROWS)
    test(`${r.m} · ${r.entity}: nút trên dòng gắn đúng bản ghi; gửi việc theo bản ghi; Bỏ gắn về theo màn`, async ({ page }) => {
      test.skip(isMobile(page), 'luồng desktop');
      await page.goto(`/${r.m}${S}`);
      if (r.list) await page.getByTestId('cal-view-list').click();
      const row = page.locator(r.row).first();
      await expect(row).toBeVisible();
      await row.getByRole('button', { name: r.btn }).click();
      const panel = page.getByTestId(r.tid);
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute('data-entity', r.entity);
      await expect(panel).toHaveAttribute('data-record', r.id);
      await expect(panel.getByTestId(`${r.tid}-msgs`).getByTestId('screen-ai-user')).toHaveCount(0);
      await panel.getByTestId(`${r.tid}-task`).fill('Tóm tắt việc cần làm tiếp');
      await panel.getByTestId(`${r.tid}-submit`).click();
      await expect(panel.getByTestId('screen-ai-user')).toContainText('Tóm tắt việc cần làm tiếp');
      await expect(panel.getByTestId('screen-ai-msg').first()).toBeVisible();
      await page.getByTestId(`${r.tid}-unbind`).click();
      await expect(page.getByTestId(r.tid)).toHaveCount(0);
    });

  test('đề nghị thanh toán: tab AI nhúng khung gắn bản ghi; việc gợi ý chỉ trích vào ô việc', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/invoices${S}`);
    await page.locator('[data-invoice="inv_2041"]').click();
    const drawer = page.getByTestId('iv-drawer');
    await drawer.getByRole('tab', { name: 'AI' }).click();
    const panel = drawer.getByTestId('inv-rai');
    await expect(panel).toHaveAttribute('data-record', 'inv_2041');
    await panel.getByRole('button', { name: 'Gợi ý gói gia hạn' }).click();
    await expect(panel.getByTestId('inv-rai-task')).toHaveValue('Gợi ý gói gia hạn');
    // Chọn việc không chạy gì — chưa có tin nào trong luồng.
    await expect(panel.getByTestId('screen-ai-user')).toHaveCount(0);
    await panel.getByTestId('inv-rai-submit').click();
    await expect(panel.getByTestId('screen-ai-user')).toContainText('Gợi ý gói gia hạn');
  });

  test('sản phẩm: đề xuất combo → thẻ chỉ đọc (món + giá danh mục); chiến dịch → nội dung + tiêu chí; không tạo bản ghi', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/products${S}`);
    await expect(page.locator('[data-product]')).toHaveCount(6);
    await page.locator('[data-product="pd_1"]').click();
    const drawer = page.getByTestId('pd-drawer');
    await drawer.getByRole('tab', { name: 'AI' }).click();
    const panel = drawer.getByTestId('pd-rai');
    await expect(panel).toHaveAttribute('data-record', 'pd_1');
    await panel.getByTestId('pd-rai-intent-product_combo').click();
    await panel.getByTestId('pd-rai-submit').click();
    const card = panel.getByTestId('rai-proposal');
    await expect(card).toHaveAttribute('data-state', 'validated');
    await expect(card.getByTestId('rai-combo-items').locator('li')).toHaveCount(3);
    await expect(card.getByTestId('rai-combo-items')).toContainText('HIFU nâng cơ 8 buổi');
    await panel.getByTestId('pd-rai-intent-product_campaign').click();
    await panel.getByTestId('pd-rai-submit').click();
    await expect(panel.getByTestId('rai-proposal')).toContainText('Ưu đãi HIFU nâng cơ 8 buổi');
    await drawer.getByRole('button', { name: 'Đóng' }).first().click();
    await expect(page.locator('[data-product]')).toHaveCount(6);
    await expectNoHorizontalOverflow(page);
  });
});
