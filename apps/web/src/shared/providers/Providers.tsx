// Providers gốc: antd (theme token prototype + locale), next-intl, TanStack Query, dayjs đồng bộ locale.
'use client';
import { useState, type ReactNode } from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import viVN from 'antd/locale/vi_VN';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';
import { appTheme } from '@appchat/ui';
import { DevToolbar } from '../dev/DevToolbar';

const ANTD_LOCALES = { vi: viVN, en: enUS } as const;

export interface ProvidersProps {
  locale: string;
  timeZone: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}

export function Providers({ locale, timeZone, messages, children }: ProvidersProps) {
  const [qc] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  dayjs.locale(locale);
  return (
    <AntdRegistry>
      <NextIntlClientProvider locale={locale} timeZone={timeZone} messages={messages}>
        <ConfigProvider theme={appTheme} locale={ANTD_LOCALES[locale as keyof typeof ANTD_LOCALES] ?? viVN}>
          <App>
            <QueryClientProvider client={qc}>
              {children}
              <DevToolbar />
            </QueryClientProvider>
          </App>
        </ConfigProvider>
      </NextIntlClientProvider>
    </AntdRegistry>
  );
}
