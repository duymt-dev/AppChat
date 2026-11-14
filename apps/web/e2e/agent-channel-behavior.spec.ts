// TIP-022b (mock): hành vi agent trực kênh.
// - Builder: chọn Tuỳ chỉnh → lịch tuần có cấu trúc (thêm khoảng, khoảng chồng → lỗi), lưu + xuất bản; cảnh báo gán tài khoản đọc agent đang
//   gán thật của tài khoản.
// - Drawer Quản lý kênh: khối Hành vi AI Agent — bật lịch tài khoản + phân luồng từ khoá (ứng viên đã xuất bản), lời chào tường minh, lưu,
//   tải lại vẫn còn.
// - Hộp thư: hội thoại "Cần người" có tóm tắt bàn giao (hành động chờ duyệt ≠ xong) + nhãn ý định; lỗi tải → Thử lại.
// - Mobile 390: không tràn ngang.
import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, isMobile } from './support/mobile';

const Q = '?session=authed,declared,trialSeen';

test.describe('hành vi agent trực kênh (TIP-022b)', () => {
  test('Builder: lịch tuần tuỳ chỉnh có kiểm lỗi → xuất bản; cảnh báo gán tài khoản thật', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    // Gán Sales Agent trực tài khoản Zalo (cấu hình thật ở drawer kênh) rồi mở agent khác cùng loại kênh → cảnh báo nêu đúng agent.
    await page.goto(`/settings/channels${Q}`);
    await page.getByTestId('st-ch-zalo_personal').click();
    const d = page.getByTestId('st-ch-drawer');
    await d.getByTestId(/^st-ch-drawer-acct-/).first().click();
    await d.getByTestId('st-ch-drawer-agent').selectOption('ag_sales');
    await d.getByTestId('st-ch-drawer-save').click();
    await expect(d).toHaveCount(0);
    await page.locator('[data-nav="agents"]').click();
    await page.locator('[data-agent="ag_lead"]').getByTestId('ag-edit').click();
    const warn = page.getByTestId('agb-binding-warning');
    await expect(warn).toContainText('Trâm · 0907 711 888 — Sales Agent');
    await expect(warn).toContainText('Xuất bản không đổi gán');

    await page.getByTestId('agb-hours').selectOption('custom');
    const week = page.getByTestId('agb-week');
    await expect(week).toBeVisible();
    await week.getByTestId('agb-week-0-add').click();
    await week.getByTestId('agb-week-0-add').click();
    await week.getByTestId('agb-week-0-1-from').fill('12:00');
    await expect(week.getByText('Các khung giờ trong ngày bị chồng nhau').first()).toBeVisible();
    await week.getByTestId('agb-week-0-1-rm').click();
    await expect(week.getByText('Các khung giờ trong ngày bị chồng nhau')).toHaveCount(0);
    const lead = page.locator('[data-agent="ag_lead"]');
    await page.getByTestId('agb-publish').click();
    // Seed ag_lead v2 → xuất bản = v3.
    await expect(lead.getByTestId('ag-version')).toHaveText('v3');
    await lead.getByTestId('ag-edit').click();
    await expect(page.getByTestId('agb-hours')).toHaveValue('custom');
    await expect(page.getByTestId('agb-week-0-0-from')).toHaveValue('08:00');
  });

  test('Drawer kênh: lịch tài khoản + phân luồng từ khoá + lời chào → lưu, tải lại còn nguyên', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/settings/channels${Q}`);
    await page.getByTestId('st-ch-zalo_personal').click();
    const d = page.getByTestId('st-ch-drawer');
    await d.getByTestId(/^st-ch-drawer-acct-/).first().click();
    const b = d.getByTestId('st-ch-behavior');
    await expect(b).toBeVisible();
    await expect(b.getByTestId('st-ch-behavior-save')).toBeDisabled();

    await b.getByTestId('st-ch-behavior-schedule-on').click();
    await b.getByTestId('st-ch-behavior-week-1-add').click();
    await b.getByTestId('st-ch-behavior-greeting').click();
    await b.getByTestId('st-ch-behavior-routing').click();
    await b.getByTestId('st-ch-behavior-add').click();
    // Chưa chọn agent → chưa lưu được.
    await expect(b.getByTestId('st-ch-behavior-save')).toBeDisabled();
    await b.getByTestId('st-ch-behavior-cand-0-agent').selectOption('ag_sales');
    await b.getByTestId('st-ch-behavior-cand-0-keywords').fill('giá, báo giá');
    await b.getByTestId('st-ch-behavior-cand-0-keywords').blur();
    await b.getByTestId('st-ch-behavior-cand-0-priority').fill('50');
    await b.getByTestId('st-ch-behavior-save').click();
    await expect(page.getByText('Đã lưu hành vi AI Agent')).toBeVisible();
    await expect(b.getByTestId('st-ch-behavior-save')).toBeDisabled();
    await expect(b.getByTestId('st-ch-behavior-week-1-0-from')).toHaveValue('08:00');
    await expect(b.getByTestId('st-ch-behavior-cand-0-agent')).toHaveValue('ag_sales');
    await expect(b.getByTestId('st-ch-behavior-cand-0-keywords')).toHaveValue('giá, báo giá');
    await expect(b.getByTestId('st-ch-behavior-greeting')).toHaveAttribute('aria-checked', 'true');
  });

  test('Hộp thư: tóm tắt bàn giao + nhãn ý định; hành động chờ duyệt không báo xong', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/inbox${Q}`);
    await page.locator('[data-conv="c_hieu"] button').first().click();
    await expect(page.getByTestId('intent-badge')).toHaveText('Muốn mua');
    const s = page.getByTestId('handoff-summary');
    await expect(s.getByTestId('handoff-summary-request')).toContainText('chuyển khoản');
    await expect(s.locator('[data-status="pending"]')).toContainText('chờ duyệt');
    await expect(s.locator('[data-status="ok"]')).toHaveCount(0);
    await expect(s.getByTestId('handoff-summary-unresolved')).toContainText('Chưa giải quyết');
    // Nhận xử lý → hết "Cần người" → tóm tắt ẩn.
    await page.getByTestId('handoff-banner').getByTestId('handoff-take').click();
    await expect(s).toHaveCount(0);
  });

  test('Hộp thư: lỗi tải tóm tắt → hiện lỗi + Thử lại', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(`/inbox${Q}&handoff=error`);
    await page.locator('[data-conv="c_hieu"] button').first().click();
    await expect(page.getByTestId('handoff-summary-error')).toContainText('Không tải được tóm tắt');
    await expect(page.getByTestId('handoff-summary-retry')).toBeVisible();
  });

  test('mobile 390: drawer kênh + Builder không tràn ngang', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(`/settings/channels${Q}`);
    await page.getByTestId('st-ch-zalo_personal').click();
    await page.getByTestId('st-ch-drawer').getByTestId(/^st-ch-drawer-acct-/).first().click();
    await page.getByTestId('st-ch-behavior-schedule-on').click();
    await expect(page.getByTestId('st-ch-behavior-week')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(`/inbox${Q}`);
    await expectNoHorizontalOverflow(page);
  });
});
