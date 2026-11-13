// TIP-034c — E2E chế độ http: sửa ticket hàng loạt trên backend thật. 3 ticket (1 đã đóng, dựng qua action thật) → chọn cả 3 → Đổi ưu tiên →
// xem trước → xác nhận → kết quả TỪNG id từ biên nhận (2 đã đổi, ticket đóng "Ticket đã đóng", vẫn được chọn) → Tải kết quả (Excel thật
// qua /data-jobs/:id/download) → Hoàn tác (ticket.bulk_undo: xem trước + xác nhận) → ưu tiên về như cũ; Nhật ký: log cha "Đã hoàn tác".
// 51 ticket → 202 việc nền: khung báo "đang chạy nền", không "đã xong", rồi kết quả từ /data-jobs/:id/result khi worker chạy xong.
import { expect, test, type Page } from '@playwright/test';
import { isMobile } from '../support/mobile';
import { onboarded, spoofIp } from './support';

async function auth(page: Page) {
  const token = (
    (await (await page.request.post('/api/v1/auth/refresh')).json()) as { data: { access_token: string } }
  ).data.access_token;
  const h = { authorization: `Bearer ${token}` };
  const ws = (
    (await (await page.request.get('/api/v1/session', { headers: h })).json()) as {
      data: { workspace_id: string };
    }
  ).data.workspace_id;
  return { ...h, 'x-workspace-id': ws };
}
async function act<T = Record<string, unknown>>(page: Page, id: string, input: unknown): Promise<T> {
  const r = await page.request.post(`/api/v1/actions/${id}`, {
    headers: { ...(await auth(page)), 'idempotency-key': `${id}-${Date.now()}-${Math.random()}` },
    data: { input },
  });
  expect(r.status(), await r.text()).toBe(200);
  return ((await r.json()) as { data: { result: T } }).data.result;
}
const priorityOf = async (page: Page, id: string) =>
  (
    (await (await page.request.get(`/api/v1/tickets/${id}`, { headers: await auth(page) })).json()) as {
      data: { priority: string };
    }
  ).data.priority;

test.describe('sửa ticket hàng loạt (http)', () => {
  test.beforeEach(({ page }) => spoofIp(page));

  test('kết quả từng id → tải kết quả → hoàn tác qua action chuẩn → Nhật ký đã hoàn tác', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(150_000);
    await onboarded(page, 'ticket-bulk');
    const mk = (title: string) =>
      act<{ ticket_id: string; code: string }>(page, 'ticket.create', {
        title,
        channel: 'email',
        category: 'Billing',
        priority: 'medium',
      });
    const [a, b, c] = [await mk('Hàng loạt A'), await mk('Hàng loạt B'), await mk('Hàng loạt C')];
    await act(page, 'ticket.close', { ticket_id: c.ticket_id, reason: 'resolved' });

    await page.goto('/tickets');
    for (const t of [a, b, c])
      await page.locator(`[data-ticket="${t.ticket_id}"] input[type="checkbox"]`).check();
    await page.getByTestId('tk-bulk-priority').click();
    await page.getByRole('menuitem', { name: 'Thấp' }).click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    const box = page.getByTestId('tk-bulk-results');
    await expect(box).toHaveAttribute('data-status', 'completed');
    await expect(box.getByTestId('tk-bulk-summary')).toHaveText(
      '2 ticket đã đổi · 0 đã đúng sẵn · 1 chưa áp dụng',
    );
    await expect(box.locator('[data-outcome="INVALID_TRANSITION"]')).toContainText(c.code);
    await expect(page.getByTestId('tk-bulk')).toContainText('Đã chọn 1 ticket');
    expect(await priorityOf(page, a.ticket_id)).toBe('low');

    const dl = page.waitForEvent('download');
    await box.getByTestId('tk-bulk-download').click();
    expect((await dl).suggestedFilename()).toMatch(/^ket-qua-ticket-hang-loat-.*\.xlsx$/);

    await box.getByTestId('tk-bulk-undo').click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    await expect(box.getByTestId('tk-bulk-undo-summary')).toHaveText(
      'Đã hoàn tác 2 ticket · 0 xung đột giữ nguyên · 0 không hoàn tác được',
    );
    expect(await priorityOf(page, a.ticket_id)).toBe('medium');
    expect(await priorityOf(page, b.ticket_id)).toBe('medium');

    // Tiêu đề log ở http là chữ đã dịch ("Cập nhật ticket") — định vị dòng log cha theo id từ /action-logs.
    const logs = (
      (await (await page.request.get('/api/v1/action-logs', { headers: await auth(page) })).json()) as {
        data: { id: string; action_id: string }[];
      }
    ).data;
    const parent = logs.find((l) => l.action_id === 'ticket.bulk_update')!;
    await page.goto('/assistant/actions');
    await expect(page.locator(`[data-log="${parent.id}"]`).getByTestId('log-status-badge')).toHaveText(
      'Đã hoàn tác',
    );
  });

  test('51 ticket → việc nền: "đang chạy nền" (không "đã xong") rồi kết quả từ biên nhận', async ({
    page,
  }) => {
    test.skip(isMobile(page), 'luồng desktop');
    test.setTimeout(240_000);
    await onboarded(page, 'ticket-bulk-bg');
    const ids: string[] = [];
    for (let i = 0; i < 51; i++)
      ids.push(
        (
          await act<{ ticket_id: string }>(page, 'ticket.create', {
            title: `Nền ${i}`,
            channel: 'email',
            category: 'Billing',
            priority: 'medium',
          })
        ).ticket_id,
      );
    await page.goto('/tickets');
    // Bảng phân trang (D42): đổi 100 / trang để 51 ticket cùng hiện, chọn từng dòng như người dùng.
    await page.getByTestId('tk-table-pager-size').selectOption('100');
    for (const id of ids) await page.locator(`[data-ticket="${id}"] input[type="checkbox"]`).check();
    await expect(page.getByTestId('tk-bulk')).toContainText('Đã chọn 51 ticket');
    await page.getByTestId('tk-bulk-priority').click();
    await page.getByRole('menuitem', { name: 'Cao' }).click();
    await page.getByRole('button', { name: 'Xác nhận' }).click();
    const box = page.getByTestId('tk-bulk-results');
    await expect(box.getByTestId('tk-bulk-running')).toContainText('Đang chạy nền');
    await expect(box).toHaveAttribute('data-status', 'completed', { timeout: 120_000 });
    await expect(box.getByTestId('tk-bulk-summary')).toHaveText(
      '51 ticket đã đổi · 0 đã đúng sẵn · 0 chưa áp dụng',
    );
  });
});
