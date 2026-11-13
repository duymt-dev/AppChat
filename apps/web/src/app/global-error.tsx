// Lỗi ở layout gốc (TIP-001b §2.1): thay cả root layout nên tự dựng <html>/<body> + provider tối thiểu (next-intl chỉ `common`, theme
// antd). Locale theo cookie NEXT_LOCALE → ngôn ngữ trình duyệt → vi (Blueprint §7.4); lúc prerender luôn vi.
'use client';
import { useSyncExternalStore } from 'react';
import { ConfigProvider } from 'antd';
import { NextIntlClientProvider } from 'next-intl';
import { DEFAULT_LOCALE, resolveLocale } from '@appchat/shared';
import { appTheme } from '@appchat/ui';
import { LOCALE_COOKIE } from '@/shared/i18n/locale-cookie';
import { RouteError } from '@/shared/states/RouteError';
import vi from '../../messages/vi/common.json';
import en from '../../messages/en/common.json';
import './fonts.css';
import './globals.css';

const COMMON: Record<string, typeof vi> = { vi, en };
const noop = () => () => undefined;
const clientLocale = () => {
  const cookie = document.cookie.split('; ').find((c) => c.startsWith(`${LOCALE_COOKIE}=`))?.split('=')[1];
  return resolveLocale(cookie, navigator.language, DEFAULT_LOCALE);
};

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  const locale = useSyncExternalStore(noop, clientLocale, () => DEFAULT_LOCALE);
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} timeZone="Asia/Ho_Chi_Minh" messages={{ common: COMMON[locale] ?? vi }}>
          <ConfigProvider theme={appTheme}>
            <RouteError scope="global" error={error} retry={retry} />
          </ConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
