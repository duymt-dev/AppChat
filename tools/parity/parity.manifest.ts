// Danh sách màn × trạng thái đo parity (standards/ui/prototype-parity §3). ID = ID dòng trong coding-packs/reports/goal-fe-prototype.md.
import type { Page } from '@playwright/test';

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
];
