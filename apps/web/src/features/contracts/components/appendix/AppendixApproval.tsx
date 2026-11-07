// "Duyệt & ký" phụ lục của Owner (TIP-030b F3 spec 16; COMMERCE §9 — Owner ký trước): OTP RIÊNG của phụ lục (action
// contract.appendix_owner_otp, gắn version hiện tại — mã của hợp đồng cha không dùng được) + chữ ký tay → contract.appendix_approve_and_sign.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { apiMode } from '@/shared/api/transport';
import { SignaturePad } from '@/shared/forms/SignaturePad';
import { useAppendixStyles } from '../../styles/appendix.styles';
import type { AppendixActions } from '../../hooks/useAppendices';
import type { Appendix } from '../../types';

/** Mã OTP phụ lục của mock (shared/api/mock/domains/contracts-appendix.ts) — chỉ hiện ở chế độ mock. */
const MOCK_OTP = '975310';

export function AppendixApproval({ a, x, onClose }: { a: Appendix; x: AppendixActions; onClose: () => void }) {
  const t = useTranslations('contracts.appendix');
  const { message } = App.useApp();
  const { styles, cx } = useAppendixStyles();
  const [otp, setOtp] = useState('');
  const [png, setPng] = useState('');
  const [reset, setReset] = useState(0);
  const [sent, setSent] = useState('');
  const sendOtp = async () => {
    const r = await x.ownerOtp.run({ appendix_id: a.id });
    if (r) setSent(r.result.sent_to);
  };
  const confirm = async () => {
    if (!/^\d{6}$/.test(otp)) return void message.warning(t('needOtp'));
    if (!png) return void message.warning(t('needSig'));
    if (await x.approve.run({ appendix_id: a.id, if_version: a.version, otp, signature_png: png })) onClose();
  };
  return (
    <ModalShell
      open
      stacked
      onClose={onClose}
      width={480}
      title={t('approveTitle')}
      icon="ic-shield"
      iconColor={color.brandDeep}
      iconBg={color.brandBg}
      closeLabel={t('cancel')}
      testId="ct-apx-approve"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={onClose}>
            {t('cancel')}
          </button>
          <button type="button" className={cx(styles.btn, styles.primary)} disabled={x.approve.isPending} onClick={() => void confirm()} data-testid="ct-apx-approve-ok">
            {t('approveOk')}
          </button>
        </>
      }
    >
      <div className={styles.meta}>{t('approveSub', { code: a.code, version: a.version })}</div>
      <label className={styles.field}>
        {t('otp')}
        <div className={styles.row}>
          <input className={styles.input} inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} data-testid="ct-apx-otp" />
          <button type="button" className={styles.btn} disabled={x.ownerOtp.isPending} onClick={() => void sendOtp()} data-testid="ct-apx-send-otp">
            {t('sendOtp')}
          </button>
        </div>
      </label>
      {sent ? <div className={styles.meta}>{t('otpSent', { to: sent })}</div> : null}
      {sent && apiMode() === 'mock' ? <div className={styles.meta}>{t('devOtp', { otp: MOCK_OTP })}</div> : null}
      <div className={styles.field}>
        {t('sig')}
        <button type="button" className={styles.btn} onClick={() => setReset((n) => n + 1)}>
          {t('clear')}
        </button>
      </div>
      <SignaturePad onChange={setPng} resetKey={reset} label={t('sig')} testId="ct-apx-sig" />
    </ModalShell>
  );
}
