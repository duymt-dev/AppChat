import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { getLocale, getMessages, getTimeZone } from 'next-intl/server';
import { Providers } from '@/shared/providers/Providers';
import './fonts.css';
import './globals.css';

export const metadata: Metadata = { title: 'AppChat', icons: { icon: '/brand/appchat-symbol.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const [messages, timeZone] = await Promise.all([getMessages(), getTimeZone()]);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers locale={locale} timeZone={timeZone} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
