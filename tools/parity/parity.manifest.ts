// Danh sách màn × trạng thái đo parity (standards/ui/prototype-parity §3). ID = ID dòng trong coding-packs/reports/goal-fe-prototype.md.
import type { Page } from '@playwright/test';
import { protoOverrideVals, protoSetState } from './protoState';
import { ASSISTANT_COVERAGE } from './manifests/assistant-coverage';

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
const products = { ac_module: 'products' };
const quotes = { ac_module: 'quotes' };
const contracts = { ac_module: 'contracts' };
const orders = { ac_module: 'orders' };
const invoices = { ac_module: 'invoices' };
const calendar = { ac_module: 'calendar' };
const tickets = { ac_module: 'tickets' };
const marketing = { ac_module: 'marketing' };
const loyalty = { ac_module: 'loyalty' };
const settings = (tab: string) => ({ ac_module: 'settings', ac_settings: tab });

/** Mục Cài đặt OUT (prototype-parity §6) → gỡ khỏi nav prototype để các mục còn lại đúng vị trí như V2. */
const SETTINGS_OUT = [
  'Sơ đồ tổ chức', 'Phòng ban', 'KPI & Mục tiêu', 'Phân ca trực', 'Cấu hình workflow', 'Routing & assignment',
  'API & Webhooks', 'API Playground', 'Developer tools', 'Bảo mật', 'SSO & 2FA', 'Data & Compliance', 'Đối tác tiếp thị',
];
const settingsProto = (p: Page) =>
  p.evaluate((out) => {
    const nav = [...document.querySelectorAll<HTMLElement>('.appscroll')].find((el) => el.offsetWidth === 280);
    if (!nav) return;
    const rows = [...nav.children] as HTMLElement[];
    let seenApps = 0;
    for (const el of rows) {
      const text = el.textContent?.trim() ?? '';
      if (text === 'TỰ ĐỘNG HOÁ') el.remove();
      else if (text === 'ỨNG DỤNG' && ++seenApps === 2) el.remove();
      else if (out.some((l) => text === l || (text.startsWith(l) && /^(NEW|PRO|\d+)?$/.test(text.slice(l.length))))) el.remove();
    }
  }, SETTINGS_OUT);
/** Nền tảng kết nối: thẻ Tổng đài (module OUT, không có manifest — provider-ports.md) gỡ khỏi prototype. */
const integProto = async (p: Page) => {
  await settingsProto(p);
  await p.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>('div[style*="min-height: 188px"]')) {
      if (el.textContent?.includes('Tổng đài (Call Center)')) el.remove();
    }
  });
};
const ST_MAIN = { x: 360, y: 64, width: 1080, height: 836 };
// D53 / PD-004: app căn giữa cột Cấu hình của Builder AI Agents, prototype L2659 bám lề trái. Ảnh app trả cột về lề trái
// để vẫn so pixel nội dung thay vì mask cả cột 680.
const builderLeft = async (p: Page) => {
  await p.addStyleTag({ content: '[data-testid="agb-col"] { margin: 0 !important; }' });
};
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
    proto: (p) => p.locator('.aibtn', { hasText: 'Trợ lý AI' }).first().click(),
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
    app: (p) =>
      p
        .getByTestId('updates-widget')
        .getByRole('button', { name: /Thông báo/ })
        .click(),
    clipTo: {
      proto: 'div[style*="width: 360px"][style*="position: fixed"]',
      app: '[data-testid="updates-widget"]',
    },
  },
  // ── F2 · Hộp thư ──
  { id: 'inbox:default', route: '/inbox', protoStorage: inbox },
  {
    // Prototype không có trạng thái rỗng: gỡ các dòng hội thoại khỏi DOM; app seed ?inbox=empty. So cột danh sách.
    id: 'inbox:empty',
    route: '/inbox?inbox=empty',
    protoStorage: inbox,
    proto: (p) =>
      p.evaluate(() =>
        document
          .querySelectorAll('.convrow, .row[style*="border-bottom: 1px solid rgb(243, 244, 246)"]')
          .forEach((n) => n.remove()),
      ),
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
      await p
        .locator('div', { hasText: /^Trợ lý AI$/ })
        .last()
        .click();
      await p.locator('.chip', { hasText: 'Gửi template ZNS' }).evaluate((n) => n.remove());
    },
    app: (p) => p.click('[data-testid="inbox-ai-open"]'),
    clipTo: {
      proto: 'div[style*="width: min(440px"]',
      app: '[data-testid="inbox-ai-modal"] [role="dialog"]',
    },
    // Panel cuộn trong max-height:84% (.appscroll overflow-y:auto) — điểm cắt theo cuộn lệch vài dòng
    // giữa app/proto do bo khoảng cách về lưới 4 (D41); mask phần dưới mục "Chuyển" nơi biên cuộn rơi vào.
    mask: [{ x: 0, y: 560, width: 440, height: 156, reason: 'biên cuộn .appscroll lệch vài px do bo lưới 4 (D41) — mục Chuyển/footer' }],
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
    mask: [
      {
        x: 128,
        y: 285,
        width: 222,
        height: 255,
        reason: 'prototype-parity §6 Kênh — tên tài khoản theo channel registry',
      },
    ],
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
    proto: (p) =>
      p
        .locator('.appscroll', { hasText: 'Claude Cowork gợi ý trả lời' })
        .last()
        .evaluate((n) => n.scrollTo(0, n.scrollHeight)),
    app: (p) => p.locator('[data-conv="c_hieu"] button').first().click(),
    clipTo: {
      // border-radius đổi 12px→14px ở prototype ver2.1 (D44 normalize) — khớp theo gradient, bỏ ràng buộc bán kính.
      proto: 'div[style*="linear-gradient(135deg, rgb(236, 253, 245)"]',
      app: '[data-testid="handoff-banner"]',
    },
    // Trạng thái handoff không có trong prototype (REQ-C handoff): so khung thẻ, mask phần chữ khác nội dung.
    mask: [
      {
        x: 44,
        y: 8,
        width: 600,
        height: 26,
        reason: 'handoff không có trong prototype — tiêu đề / nhãn khác nội dung',
      },
      {
        x: 24,
        y: 62,
        width: 616,
        height: 52,
        reason: 'handoff không có trong prototype — bản nháp AI khác nội dung',
      },
      {
        x: 24,
        y: 136,
        width: 260,
        height: 36,
        reason: 'handoff không có trong prototype — nút Nhận xử lý / Dùng bản nháp',
      },
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
    // D56: danh sách trường = trường tuỳ biến thật của workspace (cùng Cài đặt › Trường dữ liệu), không phải 7 trường mẫu của prototype.
    mask: [
      { x: 690, y: 80, width: 190, height: 36, reason: 'đếm trường theo dữ liệu workspace (D56)' },
      { x: 0, y: 130, width: 880, height: 559, reason: 'bảng trường + chân modal theo dữ liệu workspace (D56)' },
    ],
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
      await p.locator('.aibtn', { hasText: 'Trợ lý AI' }).click();
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
    proto: (p) =>
      p
        .locator('div', { hasText: /^Cowork$/ })
        .first()
        .click(),
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
    proto: (p) =>
      p
        .locator('div', { hasText: /^Sonnet 4.5High$/ })
        .first()
        .click(),
    app: (p) => p.getByTestId('asst-tier').click(),
    clip: { x: 640, y: 190, width: 480, height: 210 },
  },
  {
    id: 'assistant:agent-picker',
    route: '/assistant',
    protoStorage: asst,
    proto: async (p) => {
      await p
        .locator('div', { hasText: /^Cowork$/ })
        .first()
        .click();
      await p
        .locator('div', { hasText: /^Chưa chọn AI Agent$/ })
        .first()
        .click();
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
      {
        x: 80,
        y: 800,
        width: 1360,
        height: 100,
        reason: 'mục Agent của bạn (danh sách agent, ngoài khung prototype)',
      },
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
    app: async (p) => {
      await p.getByTestId('ag-group').selectOption('Dịch vụ & CSKH');
    },
    clip: { x: 80, y: 60, width: 1360, height: 740 },
  },
  // E: "Mô hình AI" (tên model) → "Mức AI" (D29); kênh theo channel registry (3 kênh thay 8) — mask hai vùng đó.
  {
    id: 'agents:builder',
    route: '/agents/new',
    protoStorage: agents,
    proto: (p) => p.locator('.btnp', { hasText: 'Tạo thủ công' }).click(),
    app: builderLeft,
    appWait: '[data-testid="agb-name"]',
    mask: [
      { x: 20, y: 255, width: 340, height: 105, reason: 'D29 mức AI thay tên model' },
      {
        x: 20,
        y: 805,
        width: 680,
        height: 95,
        reason: 'prototype-parity §6 Kênh — channel registry (Zalo cá nhân / Web chat / Email)',
      },
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
    app: async (p) => {
      await builderLeft(p);
      await p.getByTestId('agb-tpl').click();
    },
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
    mask: [
      { x: 880, y: 400, width: 560, height: 30, reason: 'dòng ghi chú chạy thử (dryRun) — thêm theo D29' },
    ],
  },
  {
    id: 'agents:ai-create',
    route: '/agents',
    protoStorage: agents,
    proto: (p) => p.locator('.aibtn', { hasText: 'Trợ lý AI' }).click(),
    app: (p) => p.getByTestId('ag-ai').click(),
    appWait: '[data-testid="ag-tpl"]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  // ===== F4 — Sản phẩm =====
  // D28 / D31: nguồn đồng bộ lấy từ connector registry (Zalo cá nhân, Website + "Sắp có") thay danh sách cứng của prototype — mask hàng chip.
  {
    id: 'products:list',
    route: '/products',
    protoStorage: products,
    appWait: '[data-product]',
    mask: [
      { x: 80, y: 252, width: 1360, height: 44, reason: 'D28/D31 nguồn đồng bộ theo connector registry' },
    ],
  },
  {
    id: 'products:detail',
    route: '/products',
    protoStorage: products,
    // prototype khoá cứng pdDetailOn: false (L9527 vẫn tính pdDetail) — bật cờ để hiện drawer đúng thiết kế L5683.
    proto: async (p) => {
      await p.locator('.cmpwrap .row').first().locator('div[style*="cursor: pointer"]').first().click();
      await protoOverrideVals(p, { pdDetailOn: true });
    },
    app: (p) => p.locator('[data-product]').first().click(),
    appWait: '[data-product]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  {
    id: 'products:create',
    route: '/products',
    protoStorage: products,
    proto: (p) => p.locator('.btnp', { hasText: 'Thêm sản phẩm' }).click(),
    app: (p) => p.getByTestId('pd-add').click(),
    appWait: '[data-product]',
    clipTo: { proto: 'div[style*="width: 560px"]', app: '[data-testid="pd-form"] [role="dialog"]' },
  },
  // ===== F4 — Báo giá =====
  // COMMERCE §3: không trừ điểm loyalty trên báo giá; trạng thái theo §3; "Gửi ZBS / SMS" (OUT) → Gửi Zalo / Email / PDF.
  {
    id: 'quotes:list',
    route: '/quotes',
    protoStorage: quotes,
    appWait: '[data-quote]',
  },
  {
    id: 'quotes:editor',
    route: '/quotes',
    protoStorage: quotes,
    proto: (p) => p.locator('.btnp', { hasText: 'Tạo báo giá' }).click(),
    app: (p) => p.getByTestId('q-create').click(),
    appWait: '[data-quote]',
    clipTo: { proto: 'div[style*="width: 720px"]', app: '[data-testid="q-form"] [role="dialog"]' },
  },
  {
    id: 'quotes:detail',
    route: '/quotes',
    protoStorage: quotes,
    proto: (p) => p.locator('.row', { hasText: 'BG-2041' }).first().click(),
    app: (p) => p.locator('[data-quote="q_2041"]').first().click(),
    appWait: '[data-quote]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
    mask: [
      {
        x: 1132,
        y: 40,
        width: 200,
        height: 32,
        reason: 'COMMERCE §3 — tổng không trừ điểm loyalty trên báo giá',
      },
      {
        x: 1068,
        y: 146,
        width: 352,
        height: 40,
        reason: 'prototype-parity §6 — Gửi ZBS / SMS (OUT) → Gửi Zalo / Email / Tải PDF',
      },
    ],
  },
  // ===== F4 — Hợp đồng =====
  // COMMERCE §9: "Ký số" → "Ký điện tử"; trạng thái theo §9 (Chờ duyệt gộp vào Nháp); tạo = crmForm 720 (openContractNew → openCrmForm).
  {
    id: 'contracts:list',
    route: '/contracts',
    protoStorage: contracts,
    appWait: '[data-contract]',
  },
  {
    id: 'contracts:kanban',
    route: '/contracts',
    protoStorage: contracts,
    proto: (p) => p.locator('button', { hasText: 'Kanban' }).first().click(),
    app: (p) => p.getByTestId('ct-view-kanban').click(),
    appWait: '[data-contract]',
  },
  {
    id: 'contracts:detail',
    route: '/contracts',
    protoStorage: contracts,
    proto: async (p) => {
      await p.locator('span', { hasText: 'HĐ-1180' }).first().click();
      await protoOverrideVals(p, { ctDetailOn: true });
    },
    app: (p) => p.locator('[data-contract="ctr_1180"]').first().click(),
    appWait: '[data-contract]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
    mask: [
      {
        x: 1068,
        y: 350,
        width: 352,
        height: 34,
        reason: 'COMMERCE §9 — "Ký số" → "Ký điện tử" (ký điện tử đơn giản OTP + ký tay; ký số CA để P2)',
      },
      {
        x: 1048,
        y: 836,
        width: 392,
        height: 64,
        reason:
          'COMMERCE §9 — chân thao tác theo trạng thái (→ Đơn hàng / Chấm dứt / Duyệt & ký…) prototype không có',
      },
    ],
  },
  {
    id: 'contracts:create',
    route: '/contracts',
    protoStorage: contracts,
    proto: (p) => p.locator('.btnp', { hasText: 'Tạo hợp đồng' }).click(),
    app: (p) => p.getByTestId('ct-create').click(),
    appWait: '[data-contract]',
    clipTo: { proto: 'div[style*="width: 720px"]', app: '[data-testid="ct-form"] [role="dialog"]' },
  },
  // ===== F4 — Đơn hàng =====
  // COMMERCE §4: 2 trục (Thanh toán = pay_status, Trạng thái = tiến độ); D31: thêm 1 đơn từ sàn (badge nguồn) — mask dòng đó.
  // D52: mã đơn `DH-290411` thay `SP290411` của prototype (cùng số) — chênh vài ký tự trong cột mã / tiêu đề drawer, nằm trong ngưỡng.
  {
    id: 'orders:list',
    route: '/orders',
    protoStorage: orders,
    appWait: '[data-order]',
  },
  {
    id: 'orders:detail',
    route: '/orders',
    protoStorage: orders,
    proto: async (p) => {
      await p.locator('span', { hasText: 'SP290411' }).first().click();
      await protoOverrideVals(p, { odDetailOn: true });
    },
    app: (p) => p.locator('[data-order="ord_290411"]').first().click(),
    appWait: '[data-order]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  {
    id: 'orders:create',
    route: '/orders',
    protoStorage: orders,
    proto: (p) => p.locator('.btnp', { hasText: 'Tạo đơn hàng' }).click(),
    app: (p) => p.getByTestId('od-create').click(),
    appWait: '[data-order]',
    clipTo: { proto: 'div[style*="width: 720px"]', app: '[data-testid="od-form"] [role="dialog"]' },
  },
  // ===== F4 — Đề nghị thanh toán =====
  // COMMERCE §5: "Hóa đơn" → "Đề nghị thanh toán" (mã TT-00xxxx); chip trạng thái thêm Thu một phần / Đã huỷ; ngày dời trước 24/06 cho Quá hạn.
  {
    id: 'invoices:list',
    route: '/invoices',
    protoStorage: invoices,
    appWait: '[data-invoice]',
    mask: [
      {
        x: 108,
        y: 24,
        width: 420,
        height: 52,
        reason: 'COMMERCE §5 — tiêu đề "Hóa đơn" → "Đề nghị thanh toán" (chứng từ không thay thế hoá đơn GTGT)',
      },
    ],
  },
  {
    id: 'invoices:detail-qr',
    route: '/invoices',
    protoStorage: invoices,
    proto: async (p) => {
      await p.locator('b', { hasText: 'HD-2039' }).first().click();
      await protoOverrideVals(p, { ivDetailOn: true });
    },
    app: (p) => p.locator('[data-invoice="inv_2039"]').first().click(),
    appWait: '[data-invoice]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
    mask: [
      {
        x: 1068,
        y: 648,
        width: 352,
        height: 252,
        reason: 'COMMERCE §5 — thẻ VietQR (số tiền còn lại + nội dung CK = mã TT để khớp tự động) prototype không có',
      },
    ],
  },
  {
    // Prototype "Ghi nhận thanh toán" chỉ là toast (inbAct) → đo trạng thái sau khi đã ghi nhận: đề nghị đã thu đủ, danh sách khoản thu, 100%.
    id: 'invoices:record-payment',
    route: '/invoices',
    protoStorage: invoices,
    proto: async (p) => {
      await p.locator('b', { hasText: 'HD-2041' }).first().click();
      await protoOverrideVals(p, { ivDetailOn: true });
    },
    app: (p) => p.locator('[data-invoice="inv_2041"]').first().click(),
    appWait: '[data-invoice]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  {
    id: 'invoices:create',
    route: '/invoices',
    protoStorage: invoices,
    proto: (p) => p.locator('.btnp', { hasText: 'Tạo hóa đơn' }).click(),
    app: (p) => p.getByTestId('iv-create').click(),
    appWait: '[data-invoice]',
    clipTo: { proto: 'div[style*="width: 720px"]', app: '[data-testid="iv-form"] [role="dialog"]' },
  },
  // ===== F5 — Lịch hẹn =====
  // Ngày neo 24/06/2026 (prototype "Thứ 6, 20 tháng 6" / "Tháng 5") → mask nhãn ngày; kênh đặt theo channel registry.
  {
    id: 'calendar:list',
    route: '/calendar',
    protoStorage: calendar,
    appWait: '[data-appt]',
  },
  {
    id: 'calendar:week',
    route: '/calendar',
    protoStorage: calendar,
    proto: (p) => p.locator('button', { hasText: 'Tuần' }).first().click(),
    app: (p) => p.getByTestId('cal-view-week').click(),
    appWait: '[data-appt]',
  },
  {
    id: 'calendar:month',
    route: '/calendar',
    protoStorage: calendar,
    proto: (p) => p.locator('button', { hasText: 'Tháng' }).first().click(),
    app: (p) => p.getByTestId('cal-view-month').click(),
    appWait: '[data-appt]',
  },
  {
    // Prototype không có chế độ "Ngày" (Blueprint §7.2 ViewSwitch day) → so với khung Tuần; vùng lưới khác cột (KTV thay vì thứ) được mask.
    id: 'calendar:day',
    route: '/calendar',
    protoStorage: calendar,
    proto: (p) => p.locator('button', { hasText: 'Tuần' }).first().click(),
    app: (p) => p.getByTestId('cal-view-day').click(),
    appWait: '[data-appt]',
    mask: [{ x: 80, y: 300, width: 1360, height: 600, reason: 'Blueprint §7.2 — chế độ Ngày (làn KTV) không có trong prototype' }],
  },
  {
    id: 'calendar:appointment',
    route: '/calendar',
    protoStorage: calendar,
    proto: (p) => p.locator('.row', { hasText: 'Trị mụn chuyên sâu' }).first().click(),
    app: (p) => p.locator('[data-appt]', { hasText: 'Trị mụn chuyên sâu' }).first().click(),
    appWait: '[data-appt]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
    mask: [
      {
        x: 1060,
        y: 655,
        width: 368,
        height: 170,
        reason: 'prototype-parity §6 Kênh (SMS → Zalo cá nhân) + thẻ liệu trình COMMERCE 8b (trừ buổi khi hoàn thành)',
      },
    ],
  },
  {
    id: 'calendar:create',
    route: '/calendar',
    protoStorage: calendar,
    proto: (p) => p.locator('.btnp', { hasText: 'Tạo lịch hẹn' }).first().click(),
    app: (p) => p.getByTestId('cal-create').click(),
    appWait: '[data-appt]',
    clipTo: { proto: 'div[style*="width:540px"], div[style*="width: 540px"]', app: '[data-testid="cal-form"] [role="dialog"]' },
  },
  // ===== F5 — Ticket =====
  // Kênh theo channel registry (§6): ô kênh Instagram/Facebook/WhatsApp/Telegram → Zalo cá nhân / Web chat / Email; "Cập nhật cuối" theo giờ mock.
  {
    id: 'tickets:list',
    route: '/tickets',
    protoStorage: tickets,
    appWait: '[data-ticket]',
  },
  {
    id: 'tickets:kanban',
    route: '/tickets',
    protoStorage: tickets,
    proto: (p) => p.locator('button', { hasText: 'Kanban' }).first().click(),
    app: (p) => p.getByTestId('tk-view-kanban').click(),
    appWait: '[data-ticket]',
  },
  {
    id: 'tickets:detail',
    route: '/tickets',
    protoStorage: tickets,
    proto: (p) => p.getByText('Khách yêu cầu đổi lịch hẹn liệu trình', { exact: true }).first().click(),
    app: (p) => p.locator('[data-ticket="tk_2041"]').click(),
    appWait: '[data-ticket]',
    clip: { x: 1040, y: 0, width: 400, height: 900 },
    mask: [
      {
        x: 1056,
        y: 196,
        width: 368,
        height: 90,
        reason: 'PD-002 — đồng hồ SLA tính từ ttr_due_at thật (prototype hard-code 2g 14p theo ưu tiên — tkdCountdown L9165)',
      },
      {
        x: 1056,
        y: 76,
        width: 300,
        height: 20,
        reason: 'PD-003 — Tạo / Cập nhật tính từ created_at / updated_at (prototype hard-code "5 phút trước · vừa xong")',
      },
    ],
  },
  {
    id: 'marketing:campaigns',
    route: '/marketing',
    protoStorage: marketing,
    appWait: '[data-campaign]',
    mask: [
      {
        x: 80,
        y: 0,
        width: 1360,
        height: 56,
        reason: 'phụ đề kênh: Zalo cá nhân + Email (prototype-parity §6 Kênh — bỏ ZBS / ZNS / SMS)',
      },
    ],
  },
  {
    id: 'marketing:suggestions',
    route: '/marketing',
    protoStorage: marketing,
    proto: async (p) => {
      await p.getByText('AI phân tích dữ liệu khách hàng', { exact: true }).first().click();
      await p.getByText('Tái kích hoạt khách hàng cũ', { exact: true }).first().waitFor({ timeout: 8000 });
    },
    app: async (p) => {
      await p.locator('[data-testid="mk-analyze"]').click();
      await p.locator('[data-suggestion]').first().waitFor({ timeout: 8000 });
    },
    appWait: '[data-campaign]',
  },
  {
    id: 'marketing:wizard',
    route: '/marketing',
    protoStorage: marketing,
    proto: (p) => p.getByText('Tạo chiến dịch thủ công', { exact: true }).first().click(),
    app: (p) => p.locator('[data-testid="mk-create"]').click(),
    appWait: '[data-campaign]',
    mask: [
      {
        x: 174,
        y: 360,
        width: 1092,
        height: 260,
        reason: 'bước Kênh gửi: 2 kênh Zalo cá nhân + Email, chọn 1 (prototype-parity §6 Kênh — bỏ ZNS / OA / SMS / FB / WhatsApp)',
      },
    ],
  },
  {
    id: 'marketing:analytics',
    route: '/marketing',
    protoStorage: marketing,
    proto: (p) => p.getByText('Flash Sale 20/04 — ZNS', { exact: true }).first().click(),
    app: (p) => p.locator('[data-campaign="cp_2101"]').click(),
    appWait: '[data-campaign]',
  },
  {
    id: 'marketing:ai',
    route: '/marketing',
    protoStorage: marketing,
    proto: (p) => p.locator('[title="Trợ lý AI · Marketing"]').first().click(),
    app: (p) => p.locator('[data-testid="mk-ai-open"]').click(),
    appWait: '[data-campaign]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  // TIP-023c G2: drawer Trợ lý theo màn ở trạng thái mở chưa hỏi (khung prototype giữ nguyên).
  {
    id: 'quotes:ai',
    route: '/quotes',
    protoStorage: quotes,
    proto: (p) => p.locator('[title="Trợ lý AI · Báo giá"]').first().click(),
    app: (p) => p.locator('[data-testid="q-ai-open"]').click(),
    appWait: '[data-quote]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  // TIP-023c G2: drawer Trợ lý theo màn ở trạng thái mở chưa hỏi (khung prototype giữ nguyên).
  {
    id: 'contracts:ai',
    route: '/contracts',
    protoStorage: contracts,
    proto: (p) => p.locator('[title="Trợ lý AI · Hợp đồng"]').first().click(),
    app: (p) => p.locator('[data-testid="ct-ai-open"]').click(),
    appWait: '[data-contract]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  // TIP-023c G2: drawer Trợ lý theo màn ở trạng thái mở chưa hỏi (khung prototype giữ nguyên).
  {
    id: 'orders:ai',
    route: '/orders',
    protoStorage: orders,
    proto: (p) => p.locator('[title="Trợ lý AI · Đơn hàng"]').first().click(),
    app: (p) => p.locator('[data-testid="od-ai-open"]').click(),
    appWait: '[data-order]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  // TIP-023c G2: drawer Trợ lý theo màn ở trạng thái mở chưa hỏi (khung prototype giữ nguyên).
  {
    id: 'calendar:ai',
    route: '/calendar',
    protoStorage: calendar,
    proto: (p) => p.locator('[title="Trợ lý AI · Lịch hẹn"]').first().click(),
    app: (p) => p.locator('[data-testid="cal-ai-open"]').click(),
    appWait: '[data-appt]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  // TIP-023c G2: drawer Trợ lý theo màn ở trạng thái mở chưa hỏi (khung prototype giữ nguyên).
  {
    id: 'tickets:ai',
    route: '/tickets',
    protoStorage: tickets,
    proto: (p) => p.locator('[title="Trợ lý AI · Tickets"]').first().click(),
    app: (p) => p.locator('[data-testid="tk-ai-open"]').click(),
    appWait: '[data-ticket]',
    clip: { x: 1048, y: 0, width: 392, height: 900 },
  },
  {
    id: 'loyalty:overview',
    route: '/loyalty',
    protoStorage: loyalty,
    appWait: '[data-member]',
  },
  {
    id: 'loyalty:members',
    route: '/loyalty',
    protoStorage: loyalty,
    appWait: '[data-member]',
    proto: (p) => p.getByText('Danh sách thành viên', { exact: true }).first().scrollIntoViewIfNeeded(),
    app: (p) => p.getByTestId('ly-members').scrollIntoViewIfNeeded(),
    clipTo: { proto: '.cmpwrap >> nth=0', app: '[data-testid="ly-members"]' },
  },
  {
    id: 'loyalty:adjust-points',
    route: '/loyalty',
    protoStorage: loyalty,
    appWait: '[data-member]',
    proto: async (p) => {
      await p.getByText('Thêm thành viên', { exact: true }).first().click();
      await p.locator('input[placeholder="VD: 0903 123 456"]').fill('0903 123 456');
      await p.getByText('Tra cứu', { exact: true }).click();
    },
    app: async (p) => {
      await p.getByTestId('ly-add').click();
      await p.getByTestId('ly-adj-phone').fill('0903 123 456');
      await p.getByTestId('ly-adj-lookup').click();
      await p.getByTestId('ly-adj-found').waitFor();
    },
    mask: [
      {
        x: 420,
        y: 330,
        width: 600,
        height: 440,
        reason: 'bước Ghi nhận điểm: điều chỉnh tay ± + 1 trong 7 lý do, hiện số dư / hạng sau (COMMERCE §7 — điểm tự động chỉ cộng khi đơn hoàn tất, bỏ "Loại ghi nhận theo quy tắc")',
      },
    ],
  },
  {
    id: 'loyalty:config',
    route: '/loyalty',
    protoStorage: loyalty,
    appWait: '[data-member]',
    proto: (p) => p.locator('.cmpwrap').nth(2).scrollIntoViewIfNeeded(),
    app: (p) => p.getByTestId('ly-rules').scrollIntoViewIfNeeded(),
    clipTo: { proto: '.cmpwrap >> nth=2', app: '[data-testid="ly-rules"]' },
  },
  {
    id: 'settings:shell',
    route: '/settings/general',
    protoStorage: settings('general'),
    appWait: '[data-testid="st-nav"]',
    proto: settingsProto,
    clip: { x: 80, y: 0, width: 280, height: 900 },
  },
  {
    id: 'settings:general',
    route: '/settings/general',
    protoStorage: settings('general'),
    appWait: '[data-ws]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:locale',
    route: '/settings/locale',
    protoStorage: settings('locale'),
    appWait: '[data-testid="st-locale"]',
    proto: settingsProto,
    clip: { x: 360, y: 64, width: 1080, height: 400 },
  },
  {
    id: 'settings:members',
    route: '/settings/members',
    protoStorage: settings('members'),
    appWait: '[data-member]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:roles',
    route: '/settings/roles',
    protoStorage: settings('roles'),
    appWait: '[data-role]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:channels',
    route: '/settings/channels',
    protoStorage: settings('channels'),
    appWait: '[data-channel]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:web-widget',
    route: '/settings/web_widget',
    protoStorage: settings('web_widget'),
    appWait: '[data-testid="st-wg-preview"]',
    proto: settingsProto,
    clip: ST_MAIN,
    mask: [
      {
        x: 1044,
        y: 250,
        width: 360,
        height: 650,
        reason: 'PD-001 — Prototype L7210–7254: sc-if khối "Bổ sung kiến thức" đóng thừa </div></sc-if> làm cột xem trước vỡ (chỉ còn nhãn "Mã nhúng"); app dựng cột xem trước 360 theo L7261–7298',
      },
    ],
  },
  {
    id: 'settings:fields',
    route: '/settings/contacts_fields',
    protoStorage: settings('contacts_fields'),
    appWait: '[data-field]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:profile-360',
    route: '/settings/profile_360',
    protoStorage: settings('p360'),
    appWait: '[data-testid^="pl-card-"]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:tags',
    route: '/settings/tags',
    protoStorage: settings('tags'),
    appWait: '[data-tag]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:replies',
    route: '/settings/replies',
    protoStorage: settings('replies'),
    appWait: '[data-reply]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:ai-models',
    route: '/settings/ai_models',
    protoStorage: settings('ai_models'),
    appWait: '[data-tier]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:rag',
    route: '/settings/rag_data',
    protoStorage: settings('rag_data'),
    appWait: '[data-doc]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:ai-gov',
    route: '/settings/ai_gov',
    protoStorage: settings('ai_gov'),
    appWait: '[data-testid="st-gov-scopes"]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:ai-audit',
    route: '/settings/ai_audit',
    protoStorage: settings('ai_audit'),
    appWait: '[data-audit]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:audit',
    route: '/settings/audit',
    protoStorage: settings('audit'),
    appWait: '[data-audit]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:sla',
    route: '/settings/org_sla',
    protoStorage: settings('org_sla'),
    appWait: '[data-sla]',
    // E: chỉ chính sách mặc định (Blueprint §2 sla_policy) — prototype rút còn đúng một dòng tương đương.
    proto: async (p) => {
      await settingsProto(p);
      await protoSetState(p, {
        slaPolicies: [['Mặc định', 'Áp dụng cho mọi hội thoại & ticket', 'Tất cả kênh', 'Tất cả', '#2563EB', true, 0, 10, 30, 240]],
      });
      // Prototype thừa một thẻ đóng div trước khối SLA (L5776–7374) nên khối rơi ra ngoài khung padding 28/36 của panel — trả về đúng khung.
      await p.evaluate(() => {
        const t = [...document.querySelectorAll<HTMLElement>('div')].find((d) => d.textContent?.trim() === 'Giờ làm việc của con người');
        const main = t?.closest<HTMLElement>('.appscroll');
        if (!main) return;
        const kids = [...main.children] as HTMLElement[];
        kids[0]!.style.paddingBottom = '0px';
        for (const el of kids.slice(1)) {
          el.style.marginLeft = '36px';
          el.style.marginRight = '36px';
        }
      });
    },
    clip: ST_MAIN,
  },
  {
    id: 'settings:notifications',
    route: '/settings/notifications',
    protoStorage: settings('notifications'),
    appWait: '[data-event]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:billing',
    route: '/settings/billing',
    protoStorage: settings('billing'),
    appWait: '[data-testid="st-bill-hero"]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:wallet',
    route: '/settings/wallet',
    protoStorage: settings('wallet'),
    appWait: '[data-testid="st-wal-hero"]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'modal:upgrade',
    route: '/settings/billing?upgrade=1',
    protoStorage: settings('billing'),
    appWait: '[data-testid="upgrade-modal"]',
    proto: (p) => protoSetState(p, { upgradeOpen: true }),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  },
  {
    id: 'modal:buy-credit',
    route: '/settings/wallet?topup=1',
    protoStorage: settings('wallet'),
    appWait: '[data-testid="credit-modal"]',
    proto: (p) => protoSetState(p, { napOpen: true }),
    clip: { x: 0, y: 0, width: 1440, height: 900 },
  },
  {
    // Prototype không có màn hồ sơ riêng: menu avatar "Hồ sơ của tôi" (L1050, goProfile L11327) mở Cài đặt › Tổng quan → đo theo đích đó.
    id: 'profile:me',
    route: '/settings/profile',
    protoStorage: settings('general'),
    appWait: '[data-testid="st-profile-form"]',
    proto: settingsProto,
    clip: ST_MAIN,
  },
  {
    id: 'settings:integrations',
    route: '/settings/integrations',
    protoStorage: settings('integrations'),
    appWait: '[data-connector]',
    proto: integProto,
    clip: ST_MAIN,
    mask: [
      {
        x: 396,
        y: 616,
        width: 1008,
        height: 284,
        reason: 'D28: chỉ connector có manifest — nhóm Marketing bỏ SMS / ZBS (P2 / OUT), thêm SePay / Casso; thẻ "Sắp có" + Đăng ký quan tâm',
      },
    ],
  },
  {
    id: 'settings:integrations-connect',
    route: '/settings/integrations',
    protoStorage: settings('integrations'),
    appWait: '[data-connector]',
    proto: async (p) => {
      await integProto(p);
      await p.getByText('Google Sheets', { exact: true }).first().click();
      await p.getByText('Tích hợp & đồng bộ dữ liệu').waitFor();
    },
    app: async (p) => {
      await p.locator('[data-connector="casso"]').click();
      await p.getByTestId('st-int-modal').waitFor();
    },
    clipTo: { proto: 'div[style*="width: 440px"]', app: '[data-testid="st-int-modal"] [role="dialog"]' },
    mask: [{ x: 0, y: 0, width: 440, height: 80, reason: 'tên / logo connector theo manifest (D28: Google Sheets "Sắp có" → mở hộp ở connector GA)' }],
  },
  ...ASSISTANT_COVERAGE,
];
