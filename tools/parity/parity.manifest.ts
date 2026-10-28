// Danh sách màn × trạng thái đo parity (standards/ui/prototype-parity §3). ID = ID dòng trong coding-packs/reports/goal-fe-prototype.md.
import type { Page } from '@playwright/test';
import { protoSetState } from './protoState';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParityEntry {
  id: string;
  /** Route app V2 (chạy với ?parity=1). */
  route: string;
  /** localStorage seed của prototype (ac_module, ac_settings…) — đưa prototype về đúng màn. */
  protoStorage?: Record<string, string>;
  /** Thao tác sau khi load prototype (click / hover) để vào trạng thái. */
  proto?: (p: Page) => Promise<void>;
  /** Thao tác trên app V2 để vào cùng trạng thái. */
  app?: (p: Page) => Promise<void>;
  /** Vùng so sánh (mặc định 1440×900). Shell chỉ so vùng shell — không pha loãng tỉ lệ bằng nền trống. */
  clip?: Rect;
  /** Chỉ đo shell: ẩn nội dung màn ở cả hai bên (nội dung màn đo ở dòng của màn đó). */
  shellOnly?: boolean;
  /** Selector chờ trước khi chụp (mặc định: shell). Màn auth không có shell. */
  protoWait?: string;
  appWait?: string;
  /** So theo khung một phần tử (popup): lấy bbox ở mỗi bên, kích thước theo prototype. Ghi đè `clip`. */
  clipTo?: { proto: string; app: string };
  /** Vùng động / ngoại lệ có mã quyết định — tô cùng màu ở cả hai ảnh trước khi so. */
  mask?: (Rect & { reason: string })[];
}

export const VIEWPORT = { width: 1440, height: 900 } as const;
export const MAX_DIFF_RATIO = 0.05;
export const FIXED_TIME = '2026-06-24T09:00:00+07:00';

const RAIL: Rect = { x: 0, y: 0, width: 80, height: 900 };
const RAIL_EXP: Rect = { x: 0, y: 0, width: 230, height: 900 };
const dash = { ac_module: 'dashboard' };
const inbox = { ac_module: 'inbox' };
const crm = { ac_module: 'customers' };
const asst = { ac_module: 'assistant' };
const agents = { ac_module: 'agents' };
const expandProto = (p: Page) => p.click('.rail [title="Mở rộng"]');
const expandApp = (p: Page) => p.click('[data-testid="rail-toggle"]');

const AUTH_OUT = { ac_authed: '0' };
/** Ẩn đăng nhập / đăng ký mạng xã hội (D-OTP) — gỡ khỏi DOM prototype như mục OUT để phần dưới không lệch. */
const removeSocial = (p: Page) =>
  p.evaluate(() => {
    for (const g of document.querySelectorAll<HTMLElement>('.authform [style*="repeat(3, 1fr)"]')) {
      g.previousElementSibling?.remove();
      g.remove();
    }
  });
const ONB_CARD = { proto: '.onbcard', app: '[data-testid="onb-card"]' };

export const MANIFEST: ParityEntry[] = [
  {
    id: 'shell:default',
    route: '/dashboard',
    protoStorage: dash,
    shellOnly: true,
    proto: expandProto,
    app: expandApp,
    clip: RAIL_EXP,
  },
  { id: 'shell:rail-collapsed', route: '/dashboard', protoStorage: dash, shellOnly: true, clip: RAIL },
  {
    id: 'shell:flyout-crm',
    route: '/dashboard',
    protoStorage: dash,
    shellOnly: true,
    proto: (p) => p.hover('.rail .navi:has-text("Khách hàng")'),
    app: (p) => p.hover('[data-nav="customers"]'),
    clip: { x: 0, y: 0, width: 320, height: 640 },
  },
  {
    id: 'shell:notifications',
    route: '/dashboard',
    protoStorage: dash,
    shellOnly: true,
    proto: (p) => p.click('.rail .navi:has-text("Thông báo")'),
    app: (p) => p.click('[data-testid="rail-notifications"]'),
    clip: { x: 0, y: 480, width: 420, height: 420 },
  },
  {
    id: 'shell:user-menu',
    route: '/dashboard',
    protoStorage: dash,
    shellOnly: true,
    proto: (p) => p.click('.rail span:text-is("Trâm ▾")'),
    app: (p) => p.click('[data-testid="rail-user"]'),
    clip: { x: 0, y: 260, width: 360, height: 640 },
  },
  {
    // Dock = khung "Trợ lý AI · phiên bản thu nhỏ" (prototype L2938, mở ở Khách hàng). So khung đầu + chân;
    // phần thân là nội dung theo màn (gợi ý / hội thoại) — đo ở assistant:* (F3).
    id: 'shell:assistant-dock',
    route: '/dashboard',
    protoStorage: { ac_module: 'customers' },
    shellOnly: true,
    proto: (p) => p.locator('.btnp', { hasText: 'Trợ lý AI' }).first().click(),
    app: (p) => p.keyboard.press('Control+k'),
    clip: { x: 1048, y: 0, width: 392, height: 900 },
    mask: [
      { x: 1110, y: 14, width: 280, height: 42, reason: 'tiêu đề/phụ đề theo màn ("· Khách hàng")' },
      { x: 1048, y: 67, width: 392, height: 735, reason: 'thân dock theo màn — đo ở assistant:* (F3)' },
      { x: 1061, y: 810, width: 300, height: 34, reason: 'placeholder ô hỏi theo màn' },
    ],
  },

  // ── F1 · Auth (D-OTP / OQ-02: OTP qua Email, ẩn đăng nhập mạng xã hội) ──
  {
    id: 'auth:login',
    route: '/login',
    protoStorage: AUTH_OUT,
    protoWait: '.authwrap',
    appWait: '[data-testid="auth-screen"]',
    proto: async (p) => {
      await p.click('.lnk:text-is("Đăng nhập bằng email")');
      await removeSocial(p);
    },
    app: async (p) => {
      await p.fill('[data-testid="login-email"]', 'tramnt@appchat.vn');
      await p.fill('[data-testid="login-password-input"]', '••••••••••');
    },
  },
  {
    id: 'auth:otp',
    route: '/login',
    protoStorage: AUTH_OUT,
    protoWait: '.authwrap',
    appWait: '[data-testid="auth-screen"]',
    proto: async (p) => {
      await p.fill('input[placeholder="912 345 678"]', '912 345 678');
      await p.click('text=Nhận mã OTP qua Zalo');
      await removeSocial(p);
    },
    app: async (p) => {
      await p.click('text=← Đăng nhập bằng mã OTP');
      await p.fill('[data-testid="login-email"]', 'tramnt@appchat.vn');
      await p.click('[data-testid="login-send-otp"]');
      await p.waitForSelector('[data-testid="login-otp-sent"]');
    },
  },
  {
    id: 'auth:register',
    route: '/register',
    protoStorage: AUTH_OUT,
    protoWait: '.authwrap',
    appWait: '[data-testid="auth-screen"]',
    proto: async (p) => {
      await p.click('.lnk:text-is("Đăng ký dùng thử 15 ngày")');
      await p.click('text=Qua Email');
      await p.fill('.authform input[placeholder="ban@congty.vn"]', 'tramnt@appchat.vn');
      await removeSocial(p);
    },
    app: (p) => p.fill('[data-testid="register-email"]', 'tramnt@appchat.vn'),
  },
  {
    id: 'auth:forgot',
    route: '/forgot-password',
    protoStorage: AUTH_OUT,
    protoWait: '.authwrap',
    appWait: '[data-testid="auth-screen"]',
    proto: async (p) => {
      await p.click('.lnk:text-is("Đăng nhập bằng email")');
      await p.click('.lnk:text-is("Quên mật khẩu?")');
    },
    app: (p) => p.fill('[data-testid="forgot-email"]', 'tramnt@appchat.vn'),
  },
  // ── F1 · Onboarding (popup trên shell — so khung thẻ) ──
  {
    id: 'onboarding:declare-business',
    route: '/dashboard?session=authed',
    protoStorage: { ac_declared: '0', ac_onbpending: '1', ac_trialseen: '0' },
    clipTo: ONB_CARD,
    proto: async (p) => {
      await p.fill('.onbcard input', '0312 345 678');
      await p.click('.onblookup');
    },
    app: async (p) => {
      await p.fill('[data-testid="declare-id"]', '0312 345 678');
      await p.click('[data-testid="declare-lookup"]');
      await p.waitForSelector('[data-testid="declare-lookup-result"]');
    },
  },
  {
    id: 'onboarding:declare-individual',
    route: '/dashboard?session=authed',
    protoStorage: { ac_declared: '0', ac_onbpending: '1', ac_trialseen: '0' },
    clipTo: ONB_CARD,
    proto: (p) => p.click('.onbcard >> text="Cá nhân"'),
    app: (p) => p.click('[data-testid="declare-type-individual"]'),
  },
  {
    id: 'onboarding:trial-welcome',
    route: '/dashboard?session=authed,declared',
    protoStorage: { ac_trialseen: '0' },
    clipTo: ONB_CARD,
  },
  {
    id: 'onboarding:trial-expired',
    route: '/dashboard?session=authed,declared,trialSeen,expired',
    protoStorage: { ac_trialdays: '0' },
    clipTo: ONB_CARD,
  },
  // ── F2 · Tổng quan ──
  {
    // Tổng quan đang vận hành = checklist đã thu gọn (prototype obCollapsed, L1123)
    id: 'dashboard:default',
    route: '/dashboard',
    protoStorage: dash,
    proto: (p) => p.locator('.chip', { hasText: 'Thu gọn' }).first().click(),
    app: (p) => p.getByRole('button', { name: 'Thu gọn' }).click(),
  },
  {
    // Workspace mới = checklist "Bắt đầu với AppChat" mở, 0/5 (trạng thái mặc định của prototype L1089)
    id: 'dashboard:new-workspace',
    route: '/dashboard',
    protoStorage: dash,
  },
  {
    // L1139 = "Trung tâm cập nhật" (prototype không có bộ chọn widget riêng) — đo tab Thông báo + Tin tức trong khung
    id: 'dashboard:widget-picker',
    route: '/dashboard',
    protoStorage: dash,
    proto: (p) => p.locator('button', { hasText: 'Thông báo' }).last().click(),
    app: (p) => p.getByTestId('updates-widget').getByRole('button', { name: /Thông báo/ }).click(),
    clipTo: { proto: 'div[style*="width: 360px"][style*="position: fixed"]', app: '[data-testid="updates-widget"]' },
  },
  // ── F2 · Hộp thư ──
  { id: 'inbox:default', route: '/inbox', protoStorage: inbox },
  {
    // Prototype không có trạng thái rỗng: gỡ các dòng hội thoại khỏi DOM; app seed ?inbox=empty. So cột danh sách.
    id: 'inbox:empty',
    route: '/inbox?inbox=empty',
    protoStorage: inbox,
    proto: (p) => p.evaluate(() => document.querySelectorAll('.convrow, .row[style*="border-bottom: 1px solid rgb(243, 244, 246)"]').forEach((n) => n.remove())),
    clip: { x: 80, y: 44, width: 320, height: 300 },
  },
  {
    id: 'inbox:folder-rail',
    route: '/inbox',
    protoStorage: inbox,
    proto: (p) => p.click('div[style*="width: 30px; height: 30px"]:has(path[d="M4 6h16M4 12h16M4 18h16"])'),
    app: (p) => p.click('[data-testid="inbox-rail-toggle"]'),
    clip: { x: 80, y: 0, width: 560, height: 900 },
  },
  {
    id: 'inbox:conv-menu',
    route: '/inbox',
    protoStorage: inbox,
    proto: (p) => p.click('.convdots'),
    app: (p) => p.locator('[data-conv="c_lan"] .conv-dots').click(),
    clip: { x: 80, y: 280, width: 320, height: 300 },
  },
  {
    id: 'inbox:chat-menu',
    route: '/inbox',
    protoStorage: inbox,
    proto: (p) => p.click('.msgdots'),
    app: (p) => p.locator('[data-testid="msg-dots"]').first().click(),
    clip: { x: 400, y: 200, width: 700, height: 420 },
  },
  {
    id: 'inbox:ai-panel',
    route: '/inbox',
    protoStorage: inbox,
    // ZNS là mục OUT (D29, marketing chỉ Zalo cá nhân + Email): gỡ "Gửi template ZNS" khỏi prototype như mục OUT.
    proto: async (p) => {
      await p.locator('div', { hasText: /^Trợ lý AI$/ }).last().click();
      await p.locator('.chip', { hasText: 'Gửi template ZNS' }).evaluate((n) => n.remove());
    },
    app: (p) => p.click('[data-testid="inbox-ai-open"]'),
    clipTo: { proto: 'div[style*="width: min(440px"]', app: '[data-testid="inbox-ai-modal"] [role="dialog"]' },
  },
  {
    // Ngoại lệ D28 / prototype-parity §6: chỉ kênh có manifest (zalo_personal / webchat / email) kết nối được, còn lại "Sắp có".
    id: 'inbox:connect-channel',
    route: '/inbox',
    protoStorage: inbox,
    // Thẻ "Tổng đài / Call Center" gỡ như mục OUT (module Gọi điện ẩn — D07, D19); mục "Theo ngành" chưa có dữ liệu nên mask.
    proto: async (p) => {
      await p.locator('.btnp', { hasText: 'Kết Nối Kênh' }).click();
      await p.locator('.chip', { hasText: 'Tổng đài / Call Center' }).evaluate((n) => n.remove());
    },
    app: (p) => p.click('[data-testid="inbox-connect"]'),
    clipTo: { proto: 'div[style*="width: min(900px"]', app: '[data-testid="connect-modal"] [role="dialog"]' },
  },
  {
    id: 'inbox:account-switch',
    route: '/inbox',
    protoStorage: inbox,
    proto: (p) => p.locator('span', { hasText: 'Tất cả tài khoản' }).first().click(),
    app: (p) => p.click('[data-testid="acct-select"]'),
    clip: { x: 80, y: 180, width: 320, height: 360 },
    // Tên tài khoản theo channel registry (zalo_personal / webchat / email) — ngoại lệ "Kênh" prototype-parity §6.
    mask: [{ x: 128, y: 285, width: 222, height: 255, reason: 'prototype-parity §6 Kênh — tên tài khoản theo channel registry' }],
  },
  {
    id: 'inbox:zalo-group-info',
    route: '/inbox',
    protoStorage: inbox,
    proto: (p) => p.locator('.row', { hasText: 'Nhóm VIP Spa Hương Sen' }).first().click(),
    app: (p) => p.locator('[data-conv="g_vip"] button').first().click(),
  },
  {
    // Banner "Cần người" + bản nháp AI dùng khung thẻ "AI gợi ý trả lời" của prototype (L1789–1795): so thẻ đó.
    id: 'inbox:handoff',
    route: '/inbox',
    protoStorage: inbox,
    proto: (p) => p.locator('.appscroll', { hasText: 'Claude Cowork gợi ý trả lời' }).last().evaluate((n) => n.scrollTo(0, n.scrollHeight)),
    app: (p) => p.locator('[data-conv="c_hieu"] button').first().click(),
    clipTo: { proto: 'div[style*="linear-gradient(135deg, rgb(236, 253, 245)"][style*="border-radius: 12px"]', app: '[data-testid="handoff-banner"]' },
    // Trạng thái handoff không có trong prototype (REQ-C handoff): so khung thẻ, mask phần chữ khác nội dung.
    mask: [
      { x: 44, y: 8, width: 600, height: 26, reason: 'handoff không có trong prototype — tiêu đề / nhãn khác nội dung' },
      { x: 24, y: 62, width: 616, height: 52, reason: 'handoff không có trong prototype — bản nháp AI khác nội dung' },
      { x: 24, y: 136, width: 260, height: 36, reason: 'handoff không có trong prototype — nút Nhận xử lý / Dùng bản nháp' },
    ],
  },
  {
    id: 'customers:table',
    route: '/customers',
    protoStorage: crm,
  },
  {
    id: 'customers:kanban',
    route: '/customers',
    protoStorage: crm,
    proto: (p) => p.locator('button', { hasText: 'Kanban' }).click(),
    app: (p) => p.getByRole('radio', { name: 'Kanban' }).click(),
  },
  {
    id: 'customers:filter',
    route: '/customers',
    protoStorage: crm,
    proto: (p) => p.locator('.chip', { hasText: /^Lọc$/ }).click(),
    app: (p) => p.getByTestId('filter-btn').click(),
    clip: { x: 900, y: 200, width: 540, height: 380 },
  },
  {
    id: 'customers:edit',
    route: '/customers',
    protoStorage: crm,
    proto: async (p) => {
      await p.locator('div[title="Thao tác"]').first().click();
      await p.locator('div[style*="min-width: 184px"] .row', { hasText: 'Cập nhật khách hàng' }).click();
    },
    app: async (p) => {
      await p.locator('.row-dots').first().click();
      await p.getByRole('menuitem', { name: 'Cập nhật khách hàng' }).click();
    },
    clipTo: { proto: 'div[style*="width: 560px"]', app: '[data-testid="crm-edit"] [role="dialog"]' },
  },
  {
    id: 'customers:dedupe',
    route: '/customers',
    protoStorage: crm,
    proto: (p) => p.locator('.chip', { hasText: 'Check trùng' }).click(),
    app: (p) => p.getByTestId('crm-dedupe').click(),
    clipTo: { proto: 'div[style*="width: 880px"]', app: '[data-testid="crm-dedupe-modal"] [role="dialog"]' },
  },
  {
    id: 'customers:fields',
    route: '/customers',
    protoStorage: crm,
    proto: (p) => p.locator('.chip', { hasText: 'Trường mở rộng' }).click(),
    app: (p) => p.getByTestId('crm-fields').click(),
    clipTo: { proto: 'div[style*="width: 880px"]', app: '[data-testid="crm-fields-modal"] [role="dialog"]' },
  },
  {
    id: 'customers:360',
    route: '/customers',
    protoStorage: crm,
    proto: (p) => p.locator('.row', { hasText: 'Nguyễn Thị Lan' }).first().click(),
    app: (p) => p.locator('[data-contact="ct_lan"]').first().click(),
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  {
    id: 'customers:ai',
    route: '/customers',
    protoStorage: crm,
    // "Soạn ZNS chăm sóc theo phân khúc" là mục OUT (prototype-parity §6) — gỡ khỏi prototype.
    proto: async (p) => {
      await p.locator('.btnp', { hasText: 'Trợ lý AI' }).click();
      await p.locator('.chip', { hasText: 'Soạn ZNS' }).evaluate((n) => n.remove());
    },
    app: (p) => p.getByTestId('crm-ai').click(),
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  // ===== F3 — Trợ lý AI =====
  // D29: pill mức AI ("Nâng cao") thay tên model ("Sonnet 4.5") — mask đúng vùng pill (prototype-parity §6 AI Agents).
  {
    id: 'assistant:chat-welcome',
    route: '/assistant',
    protoStorage: asst,
    mask: [{ x: 846, y: 355, width: 150, height: 32, reason: 'D29 mức AI thay tên model' }],
  },
  {
    id: 'assistant:cowork-welcome',
    route: '/assistant',
    protoStorage: asst,
    proto: (p) => p.locator('div', { hasText: /^Cowork$/ }).first().click(),
    app: (p) => p.getByRole('radio', { name: 'Cowork' }).click(),
    mask: [
      { x: 846, y: 355, width: 150, height: 32, reason: 'D29 mức AI thay tên model' },
      { x: 216, y: 600, width: 1090, height: 30, reason: 'D29 thẻ agent: tag mức AI thay tên model' },
    ],
  },
  {
    id: 'assistant:thread',
    route: '/assistant',
    protoStorage: asst,
    proto: async (p) => {
      const ta = p.locator('textarea').first();
      await ta.fill('Tạo báo giá cho chị Lan');
      await ta.press('Enter');
      await p.waitForTimeout(900);
      await ta.fill('Tóm tắt tình hình kinh doanh hôm nay');
      await ta.press('Enter');
      await p.waitForTimeout(900);
    },
    app: async (p) => {
      const ta = p.getByTestId('asst-composer').locator('textarea');
      await ta.fill('Tạo báo giá cho chị Lan');
      await ta.press('Enter');
      await p.getByTestId('asst-card').waitFor();
      await p.getByTestId('asst-composer').locator('textarea').fill('Tóm tắt tình hình kinh doanh hôm nay');
      await p.getByTestId('asst-composer').locator('textarea').press('Enter');
      await p.getByTestId('asst-ai-msg').nth(1).waitFor();
    },
    mask: [{ x: 888, y: 842, width: 150, height: 32, reason: 'D29 mức AI thay tên model' }],
  },
  {
    id: 'assistant:attach',
    route: '/assistant',
    protoStorage: asst,
    proto: (p) => p.locator('button.btn-icon').first().click(),
    app: (p) => p.getByTestId('asst-plus').click(),
    clip: { x: 420, y: 100, width: 700, height: 300 },
  },
  {
    id: 'assistant:model-picker',
    route: '/assistant',
    protoStorage: asst,
    proto: (p) => p.locator('div', { hasText: /^Sonnet 4.5High$/ }).first().click(),
    app: (p) => p.getByTestId('asst-tier').click(),
    clip: { x: 640, y: 190, width: 480, height: 210 },
  },
  {
    id: 'assistant:agent-picker',
    route: '/assistant',
    protoStorage: asst,
    proto: async (p) => {
      await p.locator('div', { hasText: /^Cowork$/ }).first().click();
      await p.locator('div', { hasText: /^Chưa chọn AI Agent$/ }).first().click();
    },
    app: async (p) => {
      await p.getByRole('radio', { name: 'Cowork' }).click();
      await p.getByTestId('asst-agent').click();
    },
    clip: { x: 640, y: 30, width: 480, height: 370 },
  },
  {
    id: 'assistant:cowork-new',
    route: '/assistant/cowork',
    protoStorage: asst,
    proto: async (p) => {
      await protoSetState(p, { asstView: 'cowork' });
      await p.locator('.btnp', { hasText: 'Tạo tác vụ tự chủ' }).first().click();
    },
    app: (p) => p.getByTestId('cw-create').click(),
    clipTo: { proto: 'div[style*="width: 680px"]', app: '[data-testid="cw-new"] [role="dialog"]' },
    // D29: "Model thực thi" (tên Claude) → "Mức AI thực thi" (mức AI); ô chọn và gợi ý chân modal theo mức
    mask: [
      { x: 346, y: 576, width: 314, height: 64, reason: 'D29 mức AI thay tên model' },
      { x: 0, y: 778, width: 440, height: 50, reason: 'D29 gợi ý chân modal nêu mức AI' },
    ],
  },
  {
    id: 'assistant:cowork-drawer',
    route: '/assistant/cowork',
    protoStorage: asst,
    proto: async (p) => {
      await protoSetState(p, { asstView: 'cowork' });
      await p.waitForTimeout(150);
      await protoSetState(p, { coworkDrawer: 0, coworkTab: 'prompt' });
    },
    app: (p) => p.getByTestId('cw-task').first().click(),
    clip: { x: 920, y: 0, width: 520, height: 900 },
    mask: [{ x: 1000, y: 44, width: 260, height: 20, reason: 'D29 phụ đề nêu mức AI thay tên model' }],
  },
  // Nhật ký: "Workflow" (OUT) → Ticket; "ZNS" → Zalo (fixture) — ô chữ hai dòng đó mask; thời gian là chuỗi ngày tương đối giống nhau.
  {
    id: 'actions:log',
    route: '/assistant/actions',
    protoStorage: asst,
    proto: (p) => protoSetState(p, { asstView: 'actions' }),
    mask: [
      { x: 240, y: 345, width: 480, height: 40, reason: 'Workflow là mục OUT → Ticket' },
      { x: 240, y: 405, width: 480, height: 36, reason: 'ZNS là mục OUT → Zalo' },
      { x: 724, y: 345, width: 300, height: 40, reason: 'đối tượng của dòng Workflow (OUT)' },
    ],
  },
  // ===== F3 — AI Agents =====
  // E: ẩn "Mở Workflow" (OUT); thêm mục "Agent của bạn" dưới thư viện mẫu (prototype không render aiAgents) — mask vùng đó.
  {
    id: 'agents:list',
    route: '/agents',
    protoStorage: agents,
    appWait: '[data-testid="ag-tpl"]',
    mask: [
      { x: 1030, y: 14, width: 150, height: 42, reason: 'Mở Workflow là mục OUT (ẩn)' },
      { x: 80, y: 800, width: 1360, height: 100, reason: 'mục Agent của bạn (danh sách agent, ngoài khung prototype)' },
    ],
  },
  {
    id: 'agents:template-gallery',
    route: '/agents',
    protoStorage: agents,
    appWait: '[data-testid="ag-tpl"]',
    proto: async (p) => {
      await p.locator('select').nth(0).selectOption('Dịch vụ & CSKH');
      await p.waitForTimeout(150);
    },
    app: (p) => p.getByTestId('ag-group').selectOption('Dịch vụ & CSKH'),
    clip: { x: 80, y: 60, width: 1360, height: 740 },
  },
  // E: "Mô hình AI" (tên model) → "Mức AI" (D29); kênh theo channel registry (3 kênh thay 8) — mask hai vùng đó.
  {
    id: 'agents:builder',
    route: '/agents/new',
    protoStorage: agents,
    proto: (p) => p.locator('.btnp', { hasText: 'Tạo thủ công' }).click(),
    appWait: '[data-testid="agb-name"]',
    mask: [
      { x: 20, y: 255, width: 340, height: 105, reason: 'D29 mức AI thay tên model' },
      { x: 20, y: 805, width: 680, height: 95, reason: 'prototype-parity §6 Kênh — channel registry (Zalo cá nhân / Web chat / Email)' },
    ],
  },
  {
    id: 'agents:builder-templates',
    route: '/agents/new',
    protoStorage: agents,
    proto: async (p) => {
      await p.locator('.btnp', { hasText: 'Tạo thủ công' }).click();
      await p.locator('span', { hasText: /^Thêm mẫu lời nhắc ▾$/ }).click();
    },
    app: (p) => p.getByTestId('agb-tpl').click(),
    appWait: '[data-testid="agb-name"]',
    clip: { x: 20, y: 360, width: 680, height: 340 },
  },
  {
    id: 'agents:test-chat',
    route: '/agents/new',
    protoStorage: agents,
    proto: async (p) => {
      await p.locator('.btnp', { hasText: 'Tạo thủ công' }).click();
      const box = p.locator('input[placeholder="Nhập tin để kiểm thử…"]');
      await box.fill('Giá liệu trình bao nhiêu?');
      await box.press('Enter');
      await p.waitForTimeout(300);
    },
    app: async (p) => {
      await p.getByTestId('agb-test-input').fill('Giá liệu trình bao nhiêu?');
      await p.getByTestId('agb-test-input').press('Enter');
      await p.getByTestId('agb-ai-msg').nth(1).waitFor();
    },
    appWait: '[data-testid="agb-name"]',
    clip: { x: 880, y: 60, width: 560, height: 840 },
    mask: [{ x: 880, y: 400, width: 560, height: 30, reason: 'dòng ghi chú chạy thử (dryRun) — thêm theo D29' }],
  },
  {
    id: 'agents:ai-create',
    route: '/agents',
    protoStorage: agents,
    proto: (p) => p.locator('.btnp', { hasText: 'Trợ lý AI' }).click(),
    app: (p) => p.getByTestId('ag-ai').click(),
    appWait: '[data-testid="ag-tpl"]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
];
