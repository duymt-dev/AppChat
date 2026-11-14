// Chọn người gửi cho chiến dịch Email (TIP-012c §5.2): tài khoản kênh Email (Hộp thư) HOẶC người gửi mail của DN (Brevo / SMTP —
// campaign.mail_senders, chỉ định danh + trạng thái). Lựa chọn tường minh chốt cùng bản duyệt — đổi người gửi sau khi gửi duyệt phải gửi
// duyệt lại (server 409). Người gửi chưa dùng được hiện lý do, không chọn được.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCan } from '@/shared/authz/useCan';
import { mailSendersQuery } from '../api';
import { useWizardStyles } from '../styles/wizard.styles';
import { useComposeStyles } from '../styles/compose.styles';
import type { MarketingMeta } from '../types';

/** Giá trị select: `acc:<id>` (tài khoản kênh) | `mail:<connection>:<sender>` (mail của DN). */
export type SenderValue = string;
const MAIL = 'mail:';
export const mailValue = (connectionId: string, senderId: string) => `${MAIL}${connectionId}:${senderId}`;

export function MailSenderPicker({ meta, value, onChange }: { meta: MarketingMeta; value: SenderValue; onChange: (v: SenderValue) => void }) {
  const t = useTranslations('marketing.wiz');
  const w = useWizardStyles().styles;
  const c = useComposeStyles().styles;
  const can = useCan('campaign.manage');
  const senders = useQuery({ ...mailSendersQuery(), enabled: can }).data ?? [];
  const accounts = meta.accounts.filter((a) => a.type === 'email');
  return (
    <div className={w.field}>
      <div className={w.label}>{t('sender')}</div>
      <select className={w.input} value={value} onChange={(e) => onChange(e.target.value)} aria-label={t('sender')} data-testid="mk-wiz-sender">
        {accounts.length || senders.length ? null : <option value="">{t('noAccount')}</option>}
        {accounts.length ? (
          <optgroup label={t('senderInbox')}>
            {accounts.map((a) => (
              <option key={a.id} value={`acc:${a.id}`} disabled={a.status !== 'connected'}>
                {a.status === 'connected' ? a.name : `${a.name} · ${t('accountOff')}`}
              </option>
            ))}
          </optgroup>
        ) : null}
        {senders.length ? (
          <optgroup label={t('senderMail')}>
            {senders.map((s) => (
              <option key={`${s.connection_id}:${s.sender_id}`} value={mailValue(s.connection_id, s.sender_id)} disabled={!s.usable}>
                {s.usable ? `${s.name ? `${s.name} · ` : ''}${s.email} (${s.connection_name})` : `${s.email || s.connection_name} · ${t(`senderReason.${s.reason ?? 'unusable'}`)}`}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {value.startsWith(MAIL) ? <div className={c.optS}>{t('senderHint')}</div> : null}
    </div>
  );
}
