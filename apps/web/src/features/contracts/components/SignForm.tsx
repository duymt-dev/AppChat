// Khối ký của khách trên trang công khai (COMMERCE §9 C1 bước 3): tick đồng ý → nhận OTP (Zalo đang chat / email) → ký tay → Ký.
// Sai OTP: còn N lần; sai 5 lần thì khoá link (server trả SIGN_LINK_INVALID). "Từ chối ký" kèm xác nhận.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ApiRequestError } from '@appchat/shared';
import { SignaturePad } from '@/shared/forms/SignaturePad';
import { useSignStyles } from '../styles/sign.styles';
import { apiMode } from '@/shared/api/transport';
import { signApi } from '../api';
import type { SignView } from '../types';

const DEV_OTP = '246810';

export function SignForm({
  token,
  view,
  onDone,
}: {
  token: string;
  view: SignView;
  onDone: (v: SignView) => void;
}) {
  const t = useTranslations('contracts.sign');
  const te = useTranslations('errors');
  const { message, modal } = App.useApp();
  const { styles, cx } = useSignStyles();
  const [agree, setAgree] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [byEmail, setByEmail] = useState(false);
  const [otp, setOtp] = useState('');
  const [png, setPng] = useState('');
  const [reset, setReset] = useState(0);
  const [left, setLeft] = useState(view.otp_left);
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    if (!(e instanceof ApiRequestError)) throw e;
    if (e.error.code === 'OTP_INVALID') {
      const n = Number(e.error.message) || 0;
      setLeft(n);
      return void message.error(`${te('OTP_INVALID')} · ${t('otpLeft', { n })}`);
    }
    if (e.error.code === 'SIGN_LINK_INVALID') return onDone({ ...view, status: 'expired' });
    void message.error(te(e.error.code));
  };
  const getOtp = async () => {
    try {
      const r = await signApi.otp(token);
      setSentTo(r.sent_to);
      setByEmail(r.channel === 'email');
    } catch (e) {
      fail(e);
    }
  };
  const submit = async () => {
    if (!png) return void message.warning(t('needSig'));
    setBusy(true);
    try {
      onDone(await signApi.sign(token, { otp, signature_png: png, consent: true }));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const decline = () =>
    modal.confirm({
      title: t('declineConfirm'),
      okText: t('declineYes'),
      cancelText: t('declineNo'),
      okButtonProps: { danger: true, 'data-testid': 'sign-decline-ok' } as never,
      onOk: async () => {
        try {
          onDone(await signApi.decline(token));
        } catch (e) {
          fail(e);
        }
      },
    });

  return (
    <div className={styles.card}>
      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          data-testid="sign-consent"
        />
        {t('consent')}
      </label>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.btn}
          disabled={!agree}
          onClick={() => void getOtp()}
          data-testid="sign-get-otp"
        >
          {t('getOtp')}
        </button>
        {sentTo ? <span className={styles.hint}>{t(byEmail ? 'otpSentEmail' : 'otpSent', { to: sentTo })}</span> : null}
      </div>
      {sentTo && apiMode() === 'mock' ? (
        <div className={styles.dev}>{t('devOtp', { otp: DEV_OTP })}</div>
      ) : null}
      <div className={styles.label}>{t('otp')}</div>
      <div className={styles.row}>
        <input
          className={styles.input}
          inputMode="numeric"
          maxLength={6}
          value={otp}
          disabled={!sentTo}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          aria-label={t('otp')}
          data-testid="sign-otp"
        />
        <span className={styles.hint}>{t('otpLeft', { n: left })}</span>
      </div>
      <div className={styles.label}>
        {t('sig')}
        <button type="button" onClick={() => setReset((n) => n + 1)}>
          {t('clear')}
        </button>
      </div>
      <SignaturePad onChange={setPng} resetKey={reset} label={t('sig')} testId="sign-pad" />
      <div className={styles.actions}>
        <button
          type="button"
          className={cx(styles.btn, styles.danger)}
          onClick={decline}
          data-testid="sign-decline"
        >
          {t('decline')}
        </button>
        <button
          type="button"
          className={cx(styles.btn, styles.primary)}
          disabled={!agree || otp.length !== 6 || busy}
          onClick={() => void submit()}
          data-testid="sign-submit"
        >
          {t('submit')}
        </button>
      </div>
    </div>
  );
}
