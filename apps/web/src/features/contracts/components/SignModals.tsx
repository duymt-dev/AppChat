// "Duyệt & ký" (Owner — OTP email + ký tay, COMMERCE §9 C1 bước 1) và "Gửi ký" (link một lần 7 ngày qua Zalo đang chat / email, bước 2).
// "Gửi mã": POST /contracts/:id/sign-otp (facade action `contract.request_sign_otp`) → email người ký, trả trạng thái giao; mock hiện mã thử nghiệm.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { transport } from '@/shared/api/client';
import { apiMode } from '@/shared/api/transport';
import { SignaturePad } from '@/shared/forms/SignaturePad';
import { useContractFormStyles } from '../styles/form.styles';
import { useContractsUi } from '../contracts-store';
import { contractQuery } from '../api';
import { useTr } from '../columns';

/** Mã OTP của mock (domains/contracts-actions.ts MOCK_OWNER_OTP) — chỉ hiện ở chế độ mock. */
const MOCK_OTP = '135790';

export function ApproveSignModal() {
  const id = useContractsUi((s) => s.signFor);
  if (!id) return null;
  return <ApproveSign key={id} id={id} />;
}

function ApproveSign({ id }: { id: string }) {
  const t = useTranslations('contracts.approve');
  const { message } = App.useApp();
  const { styles, cx } = useContractFormStyles();
  const tr = useTr();
  const set = useContractsUi((s) => s.set);
  const c = useQuery(contractQuery(id)).data;
  const sign = useAction('contract.approve_and_sign');
  const [otp, setOtp] = useState('');
  const [png, setPng] = useState('');
  const [reset, setReset] = useState(0);
  const [sent, setSent] = useState(false);
  const close = () => set({ signFor: null });
  const sendOtp = async () => {
    try {
      // Facade của action `contract.request_sign_otp` (TIP-030c) — trạng thái giao thật: queued / unknown không phải "đã tới hộp thư".
      const r = await transport.post<{ sent_to: string; delivery_status?: string }>(`/contracts/${id}/sign-otp`, {});
      setSent(true);
      const st = r.delivery_status ?? 'accepted';
      if (st === 'accepted') void message.success(t('otpSent', { email: r.sent_to }));
      else if (st === 'suppressed') void message.error(t('otpFail'));
      else void message.info(t(st === 'unknown' ? 'otpUnknown' : 'otpQueued', { email: r.sent_to }));
    } catch {
      void message.error(t('otpFail'));
    }
  };
  const confirm = async () => {
    if (!/^\d{6}$/.test(otp)) return void message.warning(t('needOtp'));
    if (!png) return void message.warning(t('needSig'));
    if (await sign.run({ contract_id: id, otp, signature_png: png })) close();
  };
  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={480}
      title={t('title')}
      icon="ic-shield"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('cancel')}
      testId="ct-approve-box"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            onClick={() => void confirm()}
            data-testid="ct-approve-ok"
          >
            {t('confirm')}
          </button>
        </>
      }
    >
      {c ? (
        <div className={styles.sub}>
          {t('sub', { code: c.code, cust: c.contact_name, value: tr(c.value) })}
        </div>
      ) : null}
      <label className={styles.label}>{t('otpLabel')}</label>
      <div className={styles.otpRow}>
        <input
          className={styles.input}
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          data-testid="ct-otp"
        />
        <button
          type="button"
          className={styles.btn}
          onClick={() => void sendOtp()}
          data-testid="ct-send-otp"
        >
          {t('sendOtp')}
        </button>
      </div>
      {sent && apiMode() === 'mock' ? <div className={styles.hint}>{t('devOtp', { otp: MOCK_OTP })}</div> : null}
      <div className={styles.hint}>{t('sigHint')}</div>
      <div className={styles.sigHead}>
        <label className={styles.label}>{t('sigLabel')}</label>
        <button type="button" onClick={() => setReset((n) => n + 1)}>
          {t('clear')}
        </button>
      </div>
      <SignaturePad onChange={setPng} resetKey={reset} label={t('sigLabel')} testId="ct-sig" />
      <div className={styles.legal}>{t('legal')}</div>
    </ModalShell>
  );
}

export function SendSignModal() {
  const t = useTranslations('contracts.send');
  const { styles } = useContractFormStyles();
  const ui = useContractsUi();
  const send = useAction('contract.send_for_signature');
  if (!ui.sendFor) return null;
  const id = ui.sendFor;
  const close = () => ui.set({ sendFor: null });
  const go = async (channel: 'zalo_personal' | 'email') => {
    if (await send.run({ contract_id: id, channel })) close();
  };
  return (
    <ModalShell
      open
      stacked
      onClose={close}
      width={420}
      title={t('title')}
      icon="ic-send"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('cancel')}
      testId="ct-send"
    >
      <div className={styles.sub}>{t('sub')}</div>
      <div className={styles.channels}>
        <button
          type="button"
          className={styles.channel}
          onClick={() => void go('zalo_personal')}
          data-testid="ct-send-zalo"
        >
          <Icon name="ic-send" size={18} color={color.zalo} />
          {t('zalo')}
        </button>
        <button
          type="button"
          className={styles.channel}
          onClick={() => void go('email')}
          data-testid="ct-send-email"
        >
          <Icon name="ic-mail" size={18} color={color.text2} />
          {t('email')}
        </button>
      </div>
    </ModalShell>
  );
}
