// TIP-038 pha 2 — E2E http (backend thật): Tổng quan đọc GET /v1/dashboard — workspace mới không có số mẫu prototype (không việc follow / việc
// cần tôi giả, AI hôm nay 0, thẻ agent trống); Owner thấy ví Credit thật (10.000 credit trial); checklist onboarding ghi bền (tải lại vẫn giữ).
// Pha 3: nút Xuất màn Ticket gọi ticket.export thật → tải tệp XLSX qua /v1/data-jobs/:id/download (≤ 50 dòng — link ngay).
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

test.describe('Tổng quan (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('workspace mới: không số mẫu, Credit thật của Owner, onboarding bền', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'dashboard');
    await page.goto('/dashboard');
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expect(page.getByTestId('dash-my-work')).toContainText('Không có việc nào đang chờ bạn');
    await expect(page.getByTestId('dash-ai-today')).toContainText('0');
    await expect(page.getByTestId('dash-credit')).toContainText('10.000');
    await expect(page.getByTestId('updates-widget')).toContainText('0 khách đến hạn');
    await expect(page.getByTestId('dashboard')).not.toContainText('Chị Linh Phạm');
    await page.getByTestId('onb-step-channel').getByRole('button', { name: 'Đánh dấu bước' }).click();
    await expect(page.getByTestId('onb-checklist')).toContainText('1/5 hoàn tất');
    await page.reload();
    await expect(page.getByTestId('onb-checklist')).toContainText('1/5 hoàn tất');
  });
});

async function act(page: Page, id: string, input: unknown) {
  const token = (
    (await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }
  ).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = (
    (await (await page.request.get('/api/v1/session', { headers: h })).json()) as {
      data: { workspace_id: string };
    }
  ).data.workspace_id;
  const r = await page.request.post(`/api/v1/actions/${id}`, {
    headers: { ...h, 'x-workspace-id': ws, 'idempotency-key': `${id}-${Date.now()}` },
    data: { input },
  });
  expect(r.status(), await r.text()).toBe(200);
}

test.describe('Xuất danh sách (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('Ticket: Xuất → tệp XLSX thật, báo số dòng', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await onboarded(page, 'export');
    await act(page, 'ticket.create', {
      title: '=Khiếu nại xuất',
      channel: 'email',
      category: 'Khác',
      priority: 'high',
    });
    await page.goto('/tickets');
    const dl = page.waitForEvent('download');
    await page.getByTestId('tk-export').click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/^ticket-\d{4}-\d{2}-\d{2}\.xlsx$/);
    await expect(page.locator('.ant-message')).toContainText('Đã xuất 1 dòng');
  });
});
