// Trạng thái người gửi của kết nối mail (TIP-012c §5.1): tách "đăng nhập + TLS" (SMTP — không phải xác minh tên miền) với "người gửi đã xác
// minh" (Brevo), lý do chưa dùng được và lần thăm dò gần nhất — chỉ dữ liệu an toàn từ campaign.mail_senders (không khoá / host).
'use client';
import { useTranslations } from 'next-intl';
import type { MailSenderDto } from '@appchat/shared';
import { useFmt } from '@/shared/i18n/useFmt';
import { useEmailMktStyles } from '../../styles/email-marketing.styles';

export function MailSenderStatus({ senders }: { senders: MailSenderDto[] }) {
  const t = useTranslations('settings.emailMkt');
  const fmt = useFmt();
  const { styles, cx } = useEmailMktStyles();
  if (!senders.length) return <div className={styles.muted}>{t('noSender')}</div>;
  return (
    <div data-testid="st-em-senders">
      {senders.map((s) => (
        <div key={`${s.connection_id}:${s.sender_id}`} className={styles.row} data-testid="st-em-sender" data-usable={s.usable}>
          <div className={styles.grow}>
            <div className={styles.mono}>{s.email || t('pendingSender')}</div>
            <div className={styles.muted}>
              {t(`transport.${s.transport}`)} · {t(s.events ? 'events' : 'noEvents')}
              {s.probed_at ? ` · ${t('probedAt', { at: `${fmt.date(s.probed_at)} ${fmt.time(s.probed_at)}` })}` : ''}
            </div>
          </div>
          <span className={cx(styles.pill, s.usable ? styles.ok : styles.warn)}>{s.usable ? t(`state.${s.state}`) : t(`reason.${s.reason ?? 'unusable'}`)}</span>
        </div>
      ))}
    </div>
  );
}
