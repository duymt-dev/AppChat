// Đăng ký 3 bước — prototype L523–583. Ngoại lệ D-OTP: chỉ kênh Email (ẩn chọn Zalo + đăng ký 1 chạm); trial 15 ngày.
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
import { isEmail, useCountdown, useEnterApp } from '../hooks/useAuthFlow';

type Step = 1 | 2 | 3;

export function RegisterScreen() {
  const t = useTranslations('auth.register');
  const tl = useTranslations('auth.login');
  const { styles, cx } = useAuthStyles();
  const { styles: p } = useAuthPartStyles();
  const enter = useEnterApp();
  const timer = useCountdown(48);
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await authApi.requestOtp(email, 'register');
      timer.restart();
      setStep(2);
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    setBusy(true);
    setError(false);
    try {
      await authApi.verifyOtp(email, code, 'register');
      setStep(3);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className={p.prog} data-testid="register-progress">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cx(p.progBar, step >= i && p.progOn)} />
        ))}
      </div>
      <div className={p.stepLabel}>{t('step', { step, label: t(`steps.${step}`) })}</div>

      {step === 1 ? (
        <div data-testid="register-step-1">
          <div className={cx(styles.title, styles.titleReg)}>{t('title')}</div>
          <div className={cx(styles.subSm, p.subMid)}>{t('sub')}</div>
          <div className={p.chans}>
            <button type="button" className={p.chan} disabled aria-disabled="true" data-testid="register-chan-zalo">
              <div className={p.chanName}>{t('chanZalo')}</div>
              <div className={p.chanSub}>{t('chanZaloSub')}</div>
            </button>
            <button type="button" className={cx(p.chan, p.chanOn)} aria-pressed="true">
              <div className={p.chanName}>{t('chanEmail')}</div>
              <div className={p.chanSub}>{t('chanEmailSub')}</div>
            </button>
          </div>
          <IconField label={t('emailLabel')} value={email} onChange={setEmail} name="email" autoComplete="email" placeholder={tl('emailPlaceholder')} testId="register-email" />
          <AuthButton arrow={false} loading={busy} disabled={!isEmail(email)} onClick={() => void send()} testId="register-send">
            {t('sendOtp')}
          </AuthButton>
          <div className={p.perks}>
            <span>
              <Icon name="ic-check" size={14} strokeWidth={2.4} color={color.brandDeep} /> {t('free')}
            </span>
            <span>
              <Icon name="ic-check" size={14} strokeWidth={2.4} color={color.brandDeep} /> {t('noCard')}
            </span>
          </div>
          <div className={styles.center}>
            {t('hasAccount')}{' '}
            <Link className={styles.link} href="/login">
              {t('loginLink')}
            </Link>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div data-testid="register-step-2">
          <button type="button" className={styles.back} onClick={() => setStep(1)}>
            {t('back')}
          </button>
          <div className={cx(styles.title, styles.titleMd)}>{t('otpTitle')}</div>
          <div className={cx(p.sent, p.sentLg)}>{t('otpSent', { email })}</div>
          <OtpInput value={code} onChange={setCode} />
          {error ? <div className={p.error}>{t('invalidCode')}</div> : null}
          <div className={p.resend}>
            {timer.left > 0
              ? t.rich('resendIn', { time: timer.label, b: (c) => <b>{c}</b> })
              : t.rich('resend', {
                  link: (c) => (
                    <button type="button" className={styles.link} onClick={() => void send()}>
                      {c}
                    </button>
                  ),
                })}
            {' · '}
            <button type="button" className={styles.link} onClick={() => setStep(1)}>
              {t('changeEmail')}
            </button>
          </div>
          <AuthButton loading={busy} disabled={code.length !== 6} onClick={() => void verify()} testId="register-verify">
            {t('confirm')}
          </AuthButton>
        </div>
      ) : null}

      {step === 3 ? (
        <div data-testid="register-step-3">
          <button type="button" className={styles.back} onClick={() => setStep(2)}>
            {t('back')}
          </button>
          <div className={p.verifiedIcon}>
            <Icon name="ic-check" size={34} strokeWidth={2} color={color.brand} />
          </div>
          <div className={cx(styles.title, styles.titleMd)}>{t('verifiedTitle')}</div>
          <div className={styles.subSm}>{t('verifiedSub')}</div>
          <div className={p.userCard}>
            <div className={p.userAvatar}>{email.charAt(0).toUpperCase()}</div>
            <div className={p.grow}>
              <div className={p.userName}>{t('newUser')}</div>
              <div className={p.userSub}>{t('verifiedVia', { email })}</div>
            </div>
            <span className={p.badge}>{t('verifiedBadge')}</span>
          </div>
          <AuthButton onClick={() => void enter()} testId="register-enter">
            {t('enter')}
          </AuthButton>
        </div>
      ) : null}
    </AuthLayout>
  );
}
