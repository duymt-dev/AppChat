// Bước 2 của wizard với Zalo cá nhân (REQ-B10, prototype L777–868): QR đăng nhập + hướng dẫn 3 bước + tên tài khoản.
// QR thật đến từ worker (TIP-014) qua useZaloLogin; chưa bấm Tiếp tục thì hiện khung QR trống như prototype.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useSectionStyles } from '../styles/section.styles';
import { useChannelWizardStyles } from '../styles/channel-wizard.styles';

const QR_STEPS = ['qrStep1', 'qrStep2', 'qrStep3'] as const;

interface Props {
  label: string;
  onLabel: (v: string) => void;
  /** PNG base64 của QR (null = chưa có). */
  qr: string | null;
  status: string | null;
  failed: boolean;
}

export function ZaloQrStep({ label, onLabel, qr, status, failed }: Props) {
  const t = useTranslations('settings.channels.wizard');
  const s = useSectionStyles().styles;
  const { styles } = useChannelWizardStyles();
  const wait = failed ? t('qrExpired') : status === 'scanned' ? t('qrScanned') : status ? t('qrWaiting') : t('qrStart');
  return (
    <div className={styles.qrWrap}>
      <div className={styles.qrBox} aria-label={t('qr')} data-testid="st-ch-wizard-qr" data-status={status ?? 'idle'}>
        {qr ? (
          // QR là data URI PNG từ worker — next/image không tối ưu được ảnh nội tuyến.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/png;base64,${qr}`} alt={t('qr')} className={styles.qrImg} />
        ) : (
          <Icon name="ic-grid" size={96} color={color.text} strokeWidth={1.2} />
        )}
      </div>
      <div className={styles.qrSide}>
        <div className={styles.qrTitle}>{t('qrApp')}</div>
        <div className={styles.qrSteps}>
          {QR_STEPS.map((k, i) => (
            <div key={k} className={styles.qrStepRow}>
              <b className={styles.qrN}>{i + 1}</b>
              {t(k)}
            </div>
          ))}
        </div>
        <div className={styles.qrWait}>
          <span className={styles.qrWaitDot} />
          {wait}
        </div>
        <div className={styles.qrLabelField}>
          <div className={s.label}>{t('label')}</div>
          <input className={s.input} value={label} onChange={(e) => onLabel(e.target.value)} placeholder={t('labelPh')} disabled={!!status && !failed} data-testid="st-ch-wizard-label" />
        </div>
      </div>
    </div>
  );
}
