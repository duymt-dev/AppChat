import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const config: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  devIndicators: false,
  transpilePackages: ['@appchat/ui', '@appchat/shared', '@appchat/actions'],
  env: { NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE ?? 'mock' },
};

export default withNextIntl(config);
