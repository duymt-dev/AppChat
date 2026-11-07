// D56 (standards/domain/custom-fields.md §7): tạo trường ở Cài đặt → hiện cột + ô form + ô lọc → nhập giá trị → lọc ra đúng bản ghi → hiện trong chi tiết.
// Mock giữ dữ liệu trong bộ nhớ: chuyển màn bằng rail, không reload.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';

const defineField = async (page: Page, entity: string, label: string, opts: string) => {
  await page.getByTestId(`st-fd-tab-${entity}`).click();
  await page.getByTestId('st-fd-new').click();
  const m = page.getByTestId('st-field-modal');
  await m.getByTestId('st-fm-name').fill(label);
  await m.getByTestId('st-fm-type').selectOption('picklist');
  await m.getByTestId('st-fm-opts').fill(opts);
  await m.getByTestId('st-fm-adv').click();
  await m.getByTestId('st-fm-place-list').click();
  await m.getByTestId('st-fm-place-filter').click();
  await m.getByTestId('st-field-modal-save').click();
  await expect(page.locator('[data-field]').filter({ hasText: label })).toBeVisible();
};

test.describe('custom fields (D56)', () => {
  test('Cài đặt › Trường dữ liệu có đủ 6 màn', async ({ page }) => {
    await page.goto(`/settings/contacts_fields${S}`);
    for (const e of ['contact', 'ticket', 'order', 'product', 'quote', 'appointment']) await expect(page.getByTestId(`st-fd-tab-${e}`)).toBeVisible();
    await page.getByTestId('st-fd-tab-quote').click();
    await expect(page.locator('[data-field]')).toHaveCount(5);
    await page.getByTestId('st-fd-tab-appointment').click();
    await expect(page.locator('[data-field="skin_type"]')).toBeVisible();
  });

  test('Khách hàng: trường mới → cột + form + lọc + 360°', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/contacts_fields${S}`);
    await defineField(page, 'contact', 'Size áo', 'S/M/L');
    await page.locator('[data-nav="customers"]').click();

    // cột trên bảng (trường seed "Phân loại", "Tier khách" + trường mới)
    const table = page.getByTestId('crm-table');
    await expect(table.getByRole('columnheader', { name: 'Size áo' })).toBeVisible();
    await expect(table.locator('[data-contact="ct_lan"] [data-cf="tier"]')).toHaveText('VIP');

    // form tạo: phần "Thông tin thêm", sai bắt buộc ở form gốc không ảnh hưởng
    await page.getByTestId('crm-create').click();
    const form = page.getByTestId('crm-create-modal');
    await expect(form.getByTestId('cf-inputs')).toContainText('Thông tin thêm');
    await form.getByLabel('Họ và tên *').fill('Chị Size');
    await form.getByLabel('Số điện thoại *').fill('0911222333');
    await form.getByTestId('cf-in-tier').selectOption('Gold');
    await form.locator('[data-cf] select').last().selectOption('M');
    await page.getByTestId('crm-save').click();
    await expect(form).toHaveCount(0);

    // lọc theo trường tuỳ biến
    await page.getByTestId('filter-btn').click();
    await page.getByTestId('filter-pop').getByLabel('Size áo').selectOption('M');
    await page.getByTestId('filter-pop').getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.locator('[data-contact]')).toHaveCount(1);
    await expect(page.locator('[data-contact]').first()).toContainText('Chị Size');

    // chi tiết 360° — khối "Thông tin thêm"
    await page.locator('[data-contact]').first().click();
    const detail = page.getByTestId('crm-360').getByTestId('cf-detail');
    await expect(detail).toContainText('Gold');
    await expect(detail).toContainText('Size áo');
  });

  test('Báo giá: lọc theo trường seed; Hỗ trợ: ô lọc trên thanh', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/quotes${S}`);
    await page.getByTestId('filter-btn').click();
    await page.getByTestId('filter-pop').getByLabel('Kênh tư vấn').selectOption('Zalo');
    await page.getByTestId('filter-pop').getByRole('button', { name: 'Áp dụng' }).click();
    await expect(page.locator('[data-quote]')).toHaveCount(1);
    await page.locator('[data-nav="tickets"]').click();
    await page.getByLabel('Loại yêu cầu').selectOption('Khiếu nại');
    await expect(page.locator('[data-ticket]')).toHaveCount(1);
    await page.locator('[data-ticket]').first().click();
    await expect(page.getByTestId('cf-detail')).toContainText('Khiếu nại');
  });

  test('trường bắt buộc chặn ngay ở form (không gửi action), nhập xong thì tạo được', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/contacts_fields${S}`);
    await page.getByTestId('st-fd-tab-order').click();
    await page.getByTestId('st-fd-new').click();
    const m = page.getByTestId('st-field-modal');
    await m.getByTestId('st-fm-name').fill('Mã vận đơn');
    await m.getByTestId('st-fm-req').click();
    await m.getByTestId('st-field-modal-save').click();
    await expect(page.locator('[data-field]').filter({ hasText: 'Mã vận đơn' })).toBeVisible();
    await page.locator('[data-nav="customers"]').hover();
    await page.getByTestId('flyout-crm').getByText('Đơn bán hàng').click();
    await page.getByTestId('od-create').click();
    const form = page.getByTestId('od-form');
    await form.getByTestId('od-contact').selectOption('ct_lan');
    await form.getByTestId('od-pick').selectOption('pd_4');
    await form.getByTestId('od-save').click();
    const box = form.getByTestId('cf-inputs');
    await expect(box).toContainText('Mã vận đơn *');
    await expect(box).toContainText('Bắt buộc nhập');
    await box.locator('[data-cf] input').last().fill('VD123');
    await form.getByTestId('od-save').click();
    await expect(form).toHaveCount(0);
  });
});
