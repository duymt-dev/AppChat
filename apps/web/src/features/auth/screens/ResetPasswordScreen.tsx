// Đặt lại mật khẩu (màn mới — không có trong prototype, loại M): mở từ link email `?token=` (hiệu lực 15 phút, REQ-A01).
// Dùng đúng khung + pattern của "Quên mật khẩu".
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAuthStyles } from '../auth.styles';
import { useAuthPartStyles } from '../auth-parts.styles';
import { authApi } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { AuthButton } from '../components/AuthButton';
import { IconField } from '../components/EmailField';

export function ResetPasswordScreen() {
  const t = useTranslations('auth.reset');
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const { styles, cx } = useAuthStyles();
  const { styles: p } = useAuthPartStyles();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const mismatch = pw2.length > 0 && pw !== pw2;

  const submit = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await authApi.resetPassword(token, pw);
      setDone(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className={styles.badgeIcon}>
        <Icon name={done ? 'ic-check' : 'ic-shield'} size={done ? 32 : 28} strokeWidth={done ? 2 : 1.8} color={color.brand} />
      </div>
      {done ? (
        <div data-testid="reset-done">
          <div className={cx(styles.title, styles.titleMd)}>{t('doneTitle')}</div>
          <div className={styles.subSm}>{t('doneBody')}</div>
          <AuthButton flat onClick={() => router.push('/login')} testId="reset-to-login">
            {t('toLogin')}
          </AuthButton>
        </div>
      ) : (
        <div data-testid="reset-form">
          <div className={cx(styles.title, styles.titleMd)}>{t('title')}</div>
          <div className={styles.subSm}>{token ? t('sub') : t('invalid')}</div>
          <IconField label={t('password')} value={pw} onChange={setPw} icon="ic-shield" type="password" autoComplete="new-password" iconHigh testId="reset-password" />
          <IconField label={t('confirm')} value={pw2} onChange={setPw2} icon="ic-shield" type="password" autoComplete="new-password" iconHigh testId="reset-password2" />
          {mismatch ? <div className={p.error}>{t('mismatch')}</div> : <div className={p.hint}>{t('rule')}</div>}
          {failed ? <div className={p.error}>{t('invalid')}</div> : null}
          <AuthButton flat loading={busy} disabled={!token || pw.length < 8 || pw !== pw2} onClick={() => void submit()} testId="reset-submit">
            {t('submit')}
          </AuthButton>
        </div>
      )}
    </AuthLayout>
  );
}
