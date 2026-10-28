// Khung 2 cột của auth: logo + form + footer (ngôn ngữ chỉ vi / en — D22) | BrandPanel.
'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { LOCALES } from '@appchat/shared';
import { writeLocaleCookie } from '@/shared/i18n/locale-cookie';
import { useAuthStyles } from '../auth.styles';
import { BrandPanel } from './BrandPanel';

export interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { styles } = useAuthStyles();
  return (
    <div className={styles.wrap} data-testid="auth-screen">
      <div className={styles.form}>
        <div className={styles.logoRow}>
          <img src="/brand/appchat-symbol.png" alt={tc('appName')} />
          <div className={styles.logoText}>
            {t('logoApp')}
            <span>{t('logoChat')}</span>
            <span className={styles.edition}>{t('edition')}</span>
          </div>
        </div>
        <div className={styles.body}>{children}</div>
        <div className={styles.footer}>
          <span>{t('footer.copyright')}</span>
          <span>{t('footer.terms')}</span>
          <span>{t('footer.privacy')}</span>
          <select
            className={styles.lang}
            value={locale}
            aria-label={t('footer.language')}
            onChange={(e) => {
              writeLocaleCookie(e.target.value);
              router.refresh();
            }}
          >
            {LOCALES.filter((l) => l.enabled).map((l) => (
              <option key={l.code} value={l.code}>
                {t(`footer.lang.${l.code}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <BrandPanel />
    </div>
  );
}
