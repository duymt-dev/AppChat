'use client';
import { useMemo } from 'react';
import { useLocale, useTimeZone } from 'next-intl';
import { createFmt, type Fmt } from '@appchat/shared';

/** fmt.* theo locale + timezone hiện tại (standards/i18n §4). */
export function useFmt(): Fmt {
  const locale = useLocale();
  const timeZone = useTimeZone();
  return useMemo(() => createFmt({ locale, timeZone }), [locale, timeZone]);
}
