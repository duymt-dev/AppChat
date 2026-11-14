// Đăng nhập — prototype L471–519. Ngoại lệ D-OTP (OQ-02): OTP qua Email thay Zalo; ẩn đăng nhập mạng xã hội.
// Mặc định là form email + mật khẩu (prototype "Đăng nhập bằng email"); "← Đăng nhập bằng mã OTP" mở luồng OTP.
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAuthStyles } from '../auth.styles';
import { useAuthPartStyles } from '../auth-parts.styles';
import { authApi } from '../api';
import { AuthLayout } from '../components/AuthLayout';
import { AuthButton } from '../components/AuthButton';
import { IconField } from '../components/EmailField';
import { OtpInput } from '../components/OtpInput';
import { isEmail, useEnterApp } from '../hooks/useAuthFlow';

type Mode = 'password' | 'otp' | 'otp-sent';

export function LoginScreen() {
  const t = useTranslations('auth.login');
  const { styles, cx } = useAuthStyles();
  const { styles: p } = useAuthPartStyles();
  const enter = useEnterApp();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const run = async (fn: () => Promise<unknown>, after?: () => void | Promise<void>) => {
    setBusy(true);
    setError(false);
    try {
      await fn();
      await after?.();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className={styles.title}>{t('title')}</div>
      <div className={styles.sub}>{t('sub')}</div>

      {mode === 'password' ? (
        <form
          data-testid="login-password"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => authApi.passwordLogin(email, password, remember), enter);
          }}
        >
          <button type="button" className={styles.back} onClick={() => setMode('otp')}>
            {t('useOtp')}
          </button>
          <IconField label={t('email')} value={email} onChange={setEmail} name="email" autoComplete="email" placeholder={t('emailPlaceholder')} iconHigh testId="login-email" />
          <IconField
            label={t('password')}
            value={password}
            onChange={setPassword}
            icon="ic-shield"
            type="password"
            name="password"
            autoComplete="current-password"
            iconHigh
            testId="login-password-input"
            aside={
              <Link className={styles.link} href="/forgot-password">
                {t('forgot')}
              </Link>
            }
          />
          {error ? <div className={p.error}>{t('invalid')}</div> : null}
          <label className={styles.remember}>
            <input type="checkbox" hidden checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span className={cx(styles.check, !remember && styles.checkOff)}>
              {remember ? <Icon name="ic-check" size={10} strokeWidth={3} color={color.white} /> : null}
            </span>
            {t('remember')}
          </label>
          <AuthButton type="submit" loading={busy} disabled={!isEmail(email) || !password} testId="login-submit">
            {t('submit')}
          </AuthButton>
        </form>
      ) : null}

      {mode === 'otp' ? (
        <div data-testid="login-otp">
          <IconField label={t('email')} value={email} onChange={setEmail} name="email" autoComplete="email" placeholder={t('emailPlaceholder')} iconHigh testId="login-email" />
          <AuthButton loading={busy} disabled={!isEmail(email)} onClick={() => void run(() => authApi.requestOtp(email, 'login'), () => setMode('otp-sent'))} testId="login-send-otp">
            {t('sendOtp')}
          </AuthButton>
          <div className={p.hint}>{t('otpHint')}</div>
          <div className={p.linkRow}>
            <button type="button" className={styles.link} onClick={() => setMode('password')}>
              {t('usePassword')}
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'otp-sent' ? (
        <div data-testid="login-otp-sent">
          <button type="button" className={cx(styles.back, p.backSm)} onClick={() => setMode('otp')}>
            {t('changeEmail')}
          </button>
          <div className={p.sent}>{t.rich('otpSent', { email, b: (c) => <b>{c}</b> })}</div>
          <OtpInput value={code} onChange={setCode} />
          {error ? <div className={p.error}>{t('invalid')}</div> : null}
          <AuthButton loading={busy} disabled={code.length !== 6} onClick={() => void run(() => authApi.verifyOtp(email, code, 'login'), enter)} testId="login-verify">
            {t('confirmOtp')}
          </AuthButton>
        </div>
      ) : null}

      <div className={styles.center}>
        {t('noAccount')}{' '}
        <Link className={styles.link} href="/register">
          {t('registerLink')}
        </Link>
      </div>
      <div className={p.security}>
        <Icon name="ic-shield" size={18} color={color.brandDeep} style={{ marginTop: 1 }} />
        <div>
          <b>{t('securityTitle')}</b>
          {t('securityBody')}
        </div>
      </div>
    </AuthLayout>
  );
}
