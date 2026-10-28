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
  /** Vùng động / ngoại lệ có mã quyết định — tô cùng màu ở cả hai ảnh trước khi so. */
  mask?: (Rect & { reason: string })[];
}

export const VIEWPORT = { width: 1440, height: 900 } as const;
export const MAX_DIFF_RATIO = 0.05;
export const FIXED_TIME = '2026-06-24T09:00:00+07:00';

const RAIL: Rect = { x: 0, y: 0, width: 80, height: 900 };
const RAIL_EXP: Rect = { x: 0, y: 0, width: 230, height: 900 };
const dash = { ac_module: 'dashboard' };
const expandProto = (p: Page) => p.click('.rail [title="Mở rộng"]');
const expandApp = (p: Page) => p.click('[data-testid="rail-toggle"]');

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
];
