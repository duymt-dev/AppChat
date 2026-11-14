import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  // E2E http build riêng (playwright.http.config.ts) để không đè bản build mock.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  agentRules: false,
  devIndicators: false,
  transpilePackages: ['@appchat/ui', '@appchat/shared', '@appchat/actions'],
  env: {
    NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE ?? 'mock',
    // Socket.IO `/ws` (TIP-025, DC-141): dev / E2E nối thẳng API (rewrite của Next không chuyển WebSocket); production để trống =
    // cùng origin, nginx chuyển `/socket.io` sang API (Blueprint §11).
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL ?? (process.env.NEXT_PUBLIC_API_MODE === 'http' && process.env.NODE_ENV !== 'production' ? (process.env.API_URL ?? 'http://localhost:4000') : ''),
  },
  // Chế độ http (D57): web gọi cùng origin `/api/v1/*` → proxy sang API (production: nginx làm việc này — Blueprint §11).
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_MODE !== 'http') return [];
    return [{ source: '/api/:path*', destination: `${process.env.API_URL ?? 'http://localhost:4000'}/:path*` }];
  },
};

export default withNextIntl(config);
