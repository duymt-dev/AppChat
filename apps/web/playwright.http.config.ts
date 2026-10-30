// E2E chế độ http (D57, D59): web build NEXT_PUBLIC_API_MODE=http, `/api/*` rewrite sang API thật (API_URL). Chạy qua
// `pnpm e2e:http` (tools/scripts/e2e-http.mjs dựng api + worker bản build và MAIL_CONSOLE_DIR). Spec ở e2e/http/.
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.E2E_HTTP_PORT ?? 3418);

export default defineConfig({
  testDir: './e2e/http',
  timeout: 90_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    // distDir riêng: không đè bản build mock của `pnpm e2e`.
    command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: process.env.E2E_REUSE === '1',
    timeout: 300_000,
    env: { NEXT_PUBLIC_API_MODE: 'http', NEXT_DIST_DIR: '.next-http', API_URL: process.env.API_URL ?? 'http://localhost:4117' },
  },
});
