// E2E: desktop 1440×900 + mobile 390×844 (standards/ui/prototype-parity §9). `pnpm e2e <module>` = spec e2e/<module>.spec.ts.
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3417);

export default defineConfig({
  testDir: './e2e',
  // e2e/http/ chạy trên backend thật qua `pnpm e2e:http` (playwright.http.config.ts — TIP-011).
  testIgnore: ['**/http/**'],
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    // build + start (ổn định, không đụng dev server đang chạy). E2E_REUSE=1 để dùng server có sẵn.
    command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/dashboard`,
    // Worktree (TIP-035d): cổng bị chiếm → Playwright báo lỗi, không bao giờ chạy test vào server của worktree khác.
    reuseExistingServer: !process.env.WORKTREE_ID && process.env.E2E_REUSE === '1',
    timeout: 300_000,
    env: { NEXT_PUBLIC_API_MODE: 'mock' },
  },
});
