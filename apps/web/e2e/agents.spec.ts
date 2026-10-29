import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';

test.describe('agents', () => {
  test('thư viện mẫu: lọc nhóm / ngành, tìm, phân trang, xoá lọc; không có "Mở Workflow"', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/agents${Q}`);
    await expect(page.getByTestId('ag-tpl')).toHaveCount(20);
    await expect(page.getByTestId('ag-pg-info')).toHaveText('Hiển thị 1–20 / 45 mẫu');
    await expect(page.getByText('Mở Workflow')).toHaveCount(0);
    await page.getByRole('button', { name: '3', exact: true }).click();
    await expect(page.getByTestId('ag-pg-info')).toHaveText('Hiển thị 41–45 / 45 mẫu');
    await page.getByTestId('ag-group').selectOption('Dịch vụ & CSKH');
    await page.getByTestId('ag-industry').selectOption('Lịch hẹn');
    await expect(page.getByTestId('ag-tpl').first()).toContainText('Booking Agent');
    await page.getByTestId('ag-clear').click();
    await page.getByTestId('ag-search').fill('không-có-mẫu-này');
    await expect(page.getByText('Không có mẫu phù hợp bộ lọc.')).toBeVisible();
  });

  test('builder: mức AI không tên model, mẫu lời nhắc, tối ưu, chat thử dryRun, kênh registry, xuất bản', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/agents${Q}`);
    await expect(page.getByTestId('ag-card')).toHaveCount(6);
    await page.getByTestId('ag-new').click();
    await expect(page.getByTestId('agb-publish')).toBeDisabled();
    await expect(page.getByTestId('agent-builder')).not.toContainText(/Claude|Sonnet|Haiku|Opus/);
    await expect(page.getByTestId('agent-builder')).not.toContainText(/Facebook|WhatsApp|ZNS|HTTP|workflow/);
    await page.getByTestId('agb-tier').selectOption('max');
    await page.getByTestId('agb-tpl').click();
    await page.getByRole('menuitem', { name: 'Đặt lịch hẹn' }).click();
    await expect(page.getByTestId('agb-prompt')).toHaveValue(/trợ lý đặt lịch hẹn/);
    await page.getByTestId('agb-optimize').click();
    await expect(page.getByTestId('agb-prompt')).toHaveValue(/ĐỊNH DẠNG TRẢ LỜI/);
    await page.getByTestId('agb-test-input').fill('Đặt lịch chiều mai được không?');
    await page.getByTestId('agb-test-send').click();
    await expect(page.getByTestId('agb-ai-msg').nth(1)).toContainText('đặt lịch');
    await page.getByTestId('agb-name').fill('Booking Spa');
    await page.getByTestId('agb-publish').click();
    await expect(page.getByTestId('ag-card')).toHaveCount(7);
    const card = page.getByTestId('ag-card').first();
    await expect(card).toContainText('Booking Spa');
    await expect(card).toContainText('Tối đa');
    await expect(card.getByTestId('ag-version')).toHaveText('v1');
  });

  test('Trợ lý AI: mô tả → bản nháp → "Tạo & xuất bản"; "Mở trong builder" mang bản nháp sang', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/agents${Q}`);
    await page.getByTestId('ag-ai').click();
    await expect(page.getByTestId('ag-ai-sug')).toHaveCount(4);
    await page.getByTestId('ag-ai-sug').first().click();
    await page.getByTestId('ag-ai-input').fill('Agent CSKH cho spa, đặt lịch qua Zalo');
    await page.getByTestId('ag-ai-send').click();
    await expect(page.getByTestId('ag-ai-draft')).toContainText('CSKH Spa');
    await expect(page.getByTestId('ag-ai-draft')).toContainText('Nâng cao');
    await page.getByTestId('ag-ai-publish').click();
    await expect(page.getByTestId('ag-ai-done')).toContainText('CSKH Spa');
    await expect(page.getByTestId('ag-card')).toHaveCount(7);
    await page.getByTestId('ag-ai-input').fill('Agent CSKH thứ hai');
    await page.getByTestId('ag-ai-send').click();
    await page.getByTestId('ag-ai-builder').click();
    await expect(page.getByTestId('agb-name')).toHaveValue('CSKH Spa');
    await expect(page.getByTestId('agb-tier')).toHaveValue('advanced');
  });

  test('agent của bạn: tạm dừng, sửa + xuất bản tăng phiên bản, quay lại phiên bản, xoá', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/agents${Q}`);
    const sales = page.locator('[data-agent="ag_sales"]');
    await sales.getByTestId('ag-toggle').click();
    await expect(sales.getByTestId('ag-status')).toHaveText('Tạm dừng');
    const v0 = Number((await sales.getByTestId('ag-version').textContent())?.slice(1));
    await sales.getByTestId('ag-edit').click();
    await expect(page.getByTestId('agb-name')).toHaveValue('Sales Agent');
    await page.getByTestId('agb-threshold').fill('85');
    await page.getByTestId('agb-publish').click();
    await expect(sales.getByTestId('ag-version')).toHaveText(`v${v0 + 1}`);
    await sales.getByTestId('ag-versions').click();
    await expect(page.getByTestId('ag-ver')).toHaveCount(v0 + 1);
    await page.locator(`[data-version="${v0}"]`).getByTestId('ag-rollback').click();
    await expect(sales.getByTestId('ag-version')).toHaveText(`v${v0 + 2}`);
    await expect(page.getByTestId('ag-ver').first()).toContainText(`↩ v${v0}`);
    await page.getByTestId('ag-versions-drawer').getByRole('button', { name: 'Đóng' }).click();
    await page.locator('[data-agent="ag_retention"]').getByTestId('ag-delete').click();
    await expect(page.getByTestId('ag-card')).toHaveCount(5);
  });

  test('390: danh sách, drawer Trợ lý, builder — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(`/agents${Q}`);
    await expect(page.getByTestId('ag-tpl').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('ag-new'));
    await expectTouchTargets(page.getByTestId('ag-clear'));
    await expectTouchTargets(page.getByTestId('ag-toggle').first());
    await page.getByTestId('ag-ai').click();
    await expectTouchTargets(page.getByTestId('ag-ai-send'));
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('ag-ai-drawer').getByRole('button', { name: 'Đóng' }).click();
    await page.getByTestId('ag-new').click();
    await expect(page.getByTestId('agb-name')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('agb-publish'));
    await expectTouchTargets(page.getByTestId('agb-test-send'));
    await expectTouchTargets(page.getByTestId('agb-tools').getByRole('switch').first());
  });
});
