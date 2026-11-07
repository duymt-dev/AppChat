// next-intl: chọn locale theo cookie NEXT_LOCALE → Accept-Language → vi (Blueprint §7.4; không có locale trong URL).
import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, resolveLocale } from '@appchat/shared';
import { loadMessages } from './messages';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const accept = (await headers()).get('accept-language')?.split(',')[0];
  const locale = resolveLocale(cookieLocale, accept, DEFAULT_LOCALE);
  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: 'Asia/Ho_Chi_Minh',
    // không bao giờ hiện key thô: thiếu key thì lấy bản vi
    getMessageFallback: ({ namespace, key }) => `${namespace ?? ''}.${key}`,
  };
});
