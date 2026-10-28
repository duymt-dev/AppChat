// Quên mật khẩu — prototype L586–603 (chưa gửi / đã gửi). Luôn báo "đã gửi" kể cả email lạ (chống dò tài khoản, REQ-A01).
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAuthStyles } from '../auth.styles';
import { useAuthPartStyles } from '../auth-parts.styles';
import { authApi } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { AuthButton } from '../components/AuthButton';
import { IconField } from '../components/EmailField';
import { isEmail } from '../hooks/useAuthFlow';

export function ForgotScreen() {
  const t = useTranslations('auth.forgot');
  const tl = useTranslations('auth.login');
  const router = useRouter();
  const { styles, cx } = useAuthStyles();
  const { styles: p } = useAuthPartStyles();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await authApi.requestReset(email);
    } finally {
      setBusy(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout>
      <button type="button" className={cx(styles.back, p.backLg)} onClick={() => router.push('/login')}>
        {t('back')}
      </button>
      {sent ? (
        <div data-testid="forgot-sent">
          <div className={styles.badgeIcon}>
            <Icon name="ic-check" size={32} strokeWidth={2} color={color.brand} />
          </div>
          <div className={cx(styles.title, styles.titleMd)}>{t('sentTitle')}</div>
          <div className={cx(styles.subSm, p.subLoose)}>{t.rich('sentBody', { email, b: (c) => <b>{c}</b> })}</div>
          <AuthButton flat onClick={() => router.push('/login')} testId="forgot-to-login">
            {t('toLogin')}
          </AuthButton>
        </div>
      ) : (
        <div data-testid="forgot-form">
          <div className={styles.badgeIcon}>
            <Icon name="ic-shield" size={28} color={color.brand} />
          </div>
          <div className={cx(styles.title, styles.titleMd)}>{t('title')}</div>
          <div className={styles.subSm}>{t('sub')}</div>
          <IconField label={tl('email')} value={email} onChange={setEmail} name="email" autoComplete="email" placeholder={tl('emailPlaceholder')} iconHigh testId="forgot-email" />
          <AuthButton flat loading={busy} disabled={!isEmail(email)} onClick={() => void submit()} testId="forgot-submit">
            {t('submit')}
          </AuthButton>
        </div>
      )}
    </AuthLayout>
  );
}
