import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTouchTargets, isMobile } from './support/mobile';

const S = '?session=authed,declared,trialSeen';
const go = (section: string) => `/settings/${section}${S}`;

test.describe('settings', () => {
  test('shell: nav nhóm không có mục OUT, tìm cài đặt lọc nav, alias cũ mở đúng mục', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('general'));
    const nav = page.getByTestId('st-nav');
    for (const out of ['Sơ đồ tổ chức', 'Phòng ban', 'API & Webhooks', 'Đối tác tiếp thị', 'SSO & 2FA']) await expect(nav).not.toContainText(out);
    await page.getByTestId('st-search').fill('thanh vien');
    await expect(nav.locator('button')).toHaveCount(1);
    await nav.getByTestId('st-nav-members').click();
    await expect(page.getByTestId('st-title')).toHaveText('Thành viên');
    await page.goto(go('canned-replies'));
    await expect(page.getByTestId('st-title')).toHaveText('Câu trả lời mẫu');
  });

  test('tổng quan: sửa thông tin chung lưu qua workspace.update', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('general'));
    await page.getByTestId('st-ws-tax_code').fill('0312345678');
    await page.getByTestId('st-ws-save').click();
    await page.getByTestId('st-nav-locale').click();
    await expect(page.getByTestId('st-locale')).toBeVisible();
    await page.getByTestId('st-nav-general').click();
    await expect(page.getByTestId('st-ws-tax_code')).toHaveValue('0312345678');
  });

  test('thành viên: tìm không dấu, mời → Chờ xác nhận, đổi vai trò, thu hồi lời mời', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('members'));
    await expect(page.locator('[data-member]')).toHaveCount(6);
    await page.getByTestId('st-member-search').fill('tram');
    await expect(page.locator('[data-member]')).toHaveCount(1);
    await page.getByTestId('st-member-search').fill('');
    await page.getByTestId('st-invite').click();
    const m = page.getByTestId('st-member-modal');
    await m.getByTestId('st-mm-email').fill('sai-email');
    await m.getByTestId('st-member-modal-save').click();
    await expect(page.getByText('Email không hợp lệ')).toBeVisible();
    await m.getByTestId('st-mm-name').fill('Lê Minh Thư');
    await m.getByTestId('st-mm-email').fill('thu@spa.vn');
    await m.getByTestId('st-mm-role').selectOption('cs');
    await m.getByTestId('st-member-modal-save').click();
    const row = page.locator('[data-member]').filter({ hasText: 'thu@spa.vn' });
    await expect(row.getByTestId('st-member-status')).toHaveText('Chờ xác nhận');
    await expect(row.getByTestId('st-member-role')).toHaveText('Chăm sóc khách hàng');
    const huong = page.locator('[data-member="u_huong"]');
    await huong.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Sửa thông tin' }).click();
    await page.getByTestId('st-mm-role').selectOption('manager');
    await page.getByTestId('st-member-modal-save').click();
    await expect(huong.getByTestId('st-member-role')).toHaveText('Quản lý');
    await row.getByRole('button', { name: 'Thao tác' }).click();
    await page.getByRole('menuitem', { name: 'Thu hồi lời mời' }).click();
    await expect(page.locator('[data-member]')).toHaveCount(6);
  });

  test('vai trò: 5 vai trò hệ thống chỉ đọc (D27), ma trận đúng ROLE_DEFS', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('roles'));
    await expect(page.locator('[data-role]')).toHaveCount(5);
    await expect(page.getByTestId('st-role-new')).toBeDisabled();
    const row = page.locator('[data-perm="billing.manage"]');
    await expect(row.locator('[data-yes="1"]')).toHaveCount(1);
    await expect(page.locator('[data-perm="inbox.view"] [data-yes="0"]')).toHaveCount(1);
  });

  test('quyền: Nhân viên kinh doanh vào Thành viên → không có quyền; không thấy Vùng nguy hiểm', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('general'));
    await page.evaluate(() => localStorage.setItem('ac_mock_role', 'sales'));
    await page.reload();
    await expect(page.getByText('Vùng nguy hiểm')).toHaveCount(0);
    await expect(page.getByTestId('st-ws-save')).toHaveCount(0);
    await page.goto(go('members'));
    await expect(page.locator('[data-member]')).toHaveCount(0);
    await page.evaluate(() => localStorage.removeItem('ac_mock_role'));
  });

  test('390: nav chip cuộn ngang, thành viên, hộp mời — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(go('members'));
    await expect(page.locator('[data-member]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-nav-general'));
    await expectTouchTargets(page.getByTestId('st-invite'));
    await page.getByTestId('st-invite').click();
    await expect(page.getByTestId('st-member-modal')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('roles'));
    await expect(page.locator('[data-role]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('general'));
    await expect(page.locator('[data-ws]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
  test('kênh: kênh chưa có manifest "Sắp có", quản lý 2 cấp, ngắt tài khoản email, lọc Chưa kết nối', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('channels'));
    await expect(page.getByTestId('st-ch-facebook')).toBeDisabled();
    await page.getByTestId('st-ch-f-on').click();
    await expect(page.locator('[data-channel]')).toHaveCount(3);

    // Quản lý kênh email (đã kết nối) → drawer cấp 1 danh sách tài khoản → mở cấp 2 → Ngắt kết nối.
    await page.getByTestId('st-ch-email').click();
    const drawer = page.getByTestId('st-ch-drawer');
    await expect(drawer).toBeVisible();
    await drawer.getByTestId(/^st-ch-drawer-acct-/).first().click();
    page.once('dialog', (d) => void d.accept());
    await drawer.getByTestId('st-ch-drawer-disconnect').click();
    await expect(drawer.getByTestId(/^st-ch-drawer-acct-/)).toHaveCount(0);
    await drawer.getByTestId('st-ch-drawer-close').click();
    await expect(drawer).toHaveCount(0);
    await expect(page.locator('[data-channel]')).toHaveCount(2);

    await page.getByTestId('st-ch-f-off').click();
    await expect(page.locator('[data-channel="email"]')).toHaveCount(1);
  });

  test('kênh: thêm tài khoản email qua wizard 3 bước (email sai bị chặn, Kiểm tra kết nối trước khi tiếp tục)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('channels'));
    await page.getByTestId('st-ch-email').click();
    const drawer = page.getByTestId('st-ch-drawer');
    await expect(drawer).toBeVisible();
    await drawer.getByTestId(/^st-ch-drawer-acct-/).first().click();
    page.once('dialog', (d) => void d.accept());
    await drawer.getByTestId('st-ch-drawer-disconnect').click();
    await drawer.getByTestId('st-ch-drawer-close').click();
    await expect(drawer).toHaveCount(0);

    await page.getByTestId('st-ch-email').click();
    const w = page.getByTestId('st-ch-wizard');
    await expect(w).toBeVisible();
    // Chưa Kiểm tra kết nối → Tiếp tục bị khoá.
    await w.getByTestId('st-ch-wizard-email').fill('sai');
    await expect(w.getByTestId('st-ch-wizard-next')).toBeDisabled();
    await w.getByTestId('st-ch-wizard-imap').fill('imap.gmail.com');
    await w.getByTestId('st-ch-wizard-test').click();
    await expect(w.getByTestId('st-ch-wizard-next')).toBeEnabled();
    // Email không hợp lệ → vẫn ở bước 2 (toast lỗi), không nhảy bước.
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w.getByTestId('st-ch-wizard-email')).toBeVisible();
    await w.getByTestId('st-ch-wizard-email').fill('hotro@spa.vn');
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w.getByTestId('st-ch-wizard-cfg-name')).toBeVisible();
    await w.getByTestId('st-ch-wizard-next').click();
    await expect(w).toHaveCount(0);

    await expect(page.locator('[data-channel]')).toHaveCount(16);
    await page.getByTestId('st-ch-f-on').click();
    await expect(page.locator('[data-channel]')).toHaveCount(3);
  });

  test('tích hợp: lọc nhóm, kết nối Casso (thiếu trường bị chặn), Đăng ký quan tâm thẻ "Sắp có"', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('integrations'));
    await page.getByTestId('st-int-cat-payments').click();
    await expect(page.locator('[data-connector]')).toHaveCount(2);
    await page.locator('[data-connector="casso"]').click();
    const m = page.getByTestId('st-int-modal');
    await m.getByTestId('st-int-save').click();
    await expect(m).toBeVisible();
    await m.getByTestId('st-int-f-api_key').fill('ck_live_123');
    await m.getByTestId('st-int-save').click();
    await expect(m).toHaveCount(0);
    await expect(page.locator('[data-connector="casso"]')).toContainText('Thiết lập');
    await page.getByTestId('st-int-cat-all').click();
    await page.getByTestId('st-int-interest-kiotviet').click();
    await expect(page.getByTestId('st-int-interest-kiotviet')).toBeDisabled();
  });

  test('widget: bật nút hành động hiện ở xem trước, đổi Agent / chế độ, sửa lời chào', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('web_widget'));
    const pv = page.getByTestId('st-wg-preview');
    await expect(pv).not.toContainText('Theo dõi đơn');
    await page.getByTestId('st-wg-act-order').click();
    await expect(pv).toContainText('Theo dõi đơn');
    await page.getByTestId('st-wg-agent').filter({ hasText: 'Support Agent' }).click();
    await expect(pv).toContainText('Support Agent (AI)');
    await page.getByTestId('st-wg-mode-auto').click();
    await page.getByTestId('st-wg-greet').fill('Chào bạn, Spa nghe ạ');
    await page.getByTestId('st-wg-name').click();
    await expect(pv).toContainText('Chào bạn, Spa nghe ạ');
    await page.getByTestId('st-wg-ai-on').click();
    await expect(page.getByTestId('st-wg-agent')).toHaveCount(0);
    await page.getByTestId('st-wg-launcher').click();
    await expect(pv).not.toContainText('Xin chào! 👋');
    // TIP-017: công tắc bật widget + mã nhúng có key thật.
    await expect(page.getByTestId('st-wg-embed')).toContainText('data-key=');
    await page.getByTestId('st-wg-enabled').click();
    await expect(page.getByTestId('st-widget')).toContainText('Đang tắt');
    await page.getByTestId('st-wg-enabled').click();
    await expect(page.getByTestId('st-widget')).toContainText('Đang chạy');
  });

  test('hồ sơ 360°: danh sách mẫu, gán vai trò, tuỳ chỉnh bố cục tab (REQ-F12, M05)', async ({ page }) => {
    test.skip(isMobile(page), 'luồng desktop');
    await page.goto(go('profile_360'));
    await expect(page.getByTestId('st-title')).toHaveText('Hồ sơ 360°');
    await expect(page.locator('[data-testid^="pl-card-"]')).toHaveCount(3);
    // mẫu hệ thống không có nút Xoá.
    await expect(page.getByTestId('pl-del-pl_default')).toHaveCount(0);
    // gán vai trò CSKH cho mẫu CSKH (đã gán sẵn ở seed — bấm lại không đổi, chỉ xác nhận không lỗi).
    await page.getByTestId('pl-role-pl_cskh-cs').click();
    await expect(page.getByTestId('pl-card-pl_cskh')).toBeVisible();
    // mở hộp tuỳ chỉnh bố cục, tắt một tab, đổi tên, thêm tab mới.
    await page.getByTestId('pl-edit-pl_default').click();
    const editor = page.getByTestId('pl-editor');
    await expect(editor).toBeVisible();
    await page.locator('[data-testid="pl-tab-files"] button[role="switch"]').click();
    await page.locator('[data-testid="pl-tab-overview"] input').fill('Trang chủ');
    await page.getByTestId('pl-add-open').click();
    await page.getByTestId('pl-add-name').fill('Khối mới');
    await page.getByTestId('pl-add-save').click();
    await expect(page.locator('[data-testid^="pl-tab-"]')).toHaveCount(6);
    await page.getByTestId('pl-editor-done').click();
    await expect(editor).toHaveCount(0);
  });

  test('390: kênh, tích hợp, widget — không tràn ngang, vùng chạm ≥ 44px', async ({ page }) => {
    test.skip(!isMobile(page), 'chỉ mobile');
    await page.goto(go('channels'));
    await expect(page.locator('[data-channel]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByTestId('st-ch-email').click();
    await expect(page.getByTestId('st-ch-drawer')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('integrations'));
    await expect(page.locator('[data-connector]').first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.locator('[data-connector="casso"]').click();
    await expect(page.getByTestId('st-int-modal')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goto(go('web_widget'));
    await expect(page.getByTestId('st-wg-preview')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectTouchTargets(page.getByTestId('st-wg-aichat'));
  });
});
