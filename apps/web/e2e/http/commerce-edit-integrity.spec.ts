// TIP-032c — E2E chế độ http: sửa đơn trên backend thật — tạo đơn → Sửa từ drawer (modal riêng, không phải form tạo) → người tạo chỉ đọc,
// đổi ghi chú → lưu (order.update kèm if_version) → mở lại Sửa thấy ghi chú đã lưu trên server, người tạo giữ; lưu lần hai (phiên bản mới)
// vẫn được; form tạo vẫn là tạo mới.
import { expect, test } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('sửa đơn (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Sửa từ drawer: if_version thật, người tạo giữ, form tạo vẫn là tạo mới', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(120_000);
    await onboarded(page, 'order-edit');

    await page.goto('/products');
    await page.getByTestId('pd-add').click();
    const pf = page.getByTestId('pd-form');
    await pf.getByTestId('pd-f-type').selectOption('service');
    await pf.getByTestId('pd-f-name').fill('Liệu trình da');
    await pf.getByTestId('pd-f-price').fill('500000');
    await pf.getByTestId('pd-save').click();
    await expect(pf).toHaveCount(0);

    await page.goto('/customers');
    await page.getByTestId('crm-create').click();
    const cf = page.getByTestId('crm-create-modal');
    await cf.getByLabel('Họ và tên *').fill('Chị Hà');
    await cf.getByLabel('Số điện thoại *').fill('0909 777 432');
    await page.getByTestId('crm-save').click();
    await expect(cf).toHaveCount(0);

    await page.goto('/orders');
    await page.getByTestId('od-create').click();
    const form = page.getByTestId('od-form');
    await form.getByTestId('od-contact').selectOption({ label: 'Chị Hà' });
    await form.getByTestId('od-pick').selectOption({ label: 'Liệu trình da · 500.000₫' });
    await form.getByTestId('od-save').click();
    await expect(form).toHaveCount(0);

    const drawer = page.getByTestId('od-drawer');
    await expect(drawer).toContainText('DH-');
    await expect(drawer.getByTestId('od-assigned')).toHaveCount(0);
    const save = async (note: string) => {
      await drawer.getByTestId('od-edit-open').click();
      const edit = page.getByTestId('od-edit');
      const owner = await edit.getByTestId('od-edit-owner').inputValue();
      await expect(edit.getByTestId('od-edit-owner')).toBeDisabled();
      await edit.getByTestId('od-edit-note').fill(note);
      await edit.getByTestId('od-edit-save').click();
      await expect(edit).toHaveCount(0);
      return owner;
    };
    const owner = await save('Giao buổi chiều');
    // Lần hai: modal nạp bản mới (ghi chú vừa lưu, phiên bản mới) → lưu được, không 409.
    await drawer.getByTestId('od-edit-open').click();
    await expect(page.getByTestId('od-edit').getByTestId('od-edit-note')).toHaveValue('Giao buổi chiều');
    await page.getByTestId('od-edit').getByRole('button', { name: 'Huỷ', exact: true }).click();
    expect(await save('Giao buổi sáng')).toBe(owner);
    await expect(page.getByTestId('od-conflict')).toHaveCount(0);
    await drawer.getByTestId('od-edit-open').click();
    await expect(page.getByTestId('od-edit').getByTestId('od-edit-note')).toHaveValue('Giao buổi sáng');
    await page.getByTestId('od-edit').getByRole('button', { name: 'Huỷ', exact: true }).click();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await page.getByTestId('od-create').click();
    await expect(page.getByTestId('od-form')).toBeVisible();
    await expect(page.getByTestId('od-edit')).toHaveCount(0);
  });
});
