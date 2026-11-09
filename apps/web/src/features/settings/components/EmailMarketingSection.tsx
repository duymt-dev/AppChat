// Cài đặt › Email Marketing (TIP-012c §5.1, prototype L7033–7067): chọn nhà cung cấp (chỉ Brevo / SMTP có manifest — D28), thẻ kết nối,
// hướng dẫn 5 bước, trạng thái người gửi (đăng nhập + TLS ≠ xác minh tên miền), ghi chú hộp thư trả lời. Kết nối / ngắt dùng hộp kết nối
// chung (integration.connect / disconnect — khoá chỉ gửi qua action, không đưa cho Trợ lý). Người chỉ có campaign.manage: chỉ xem người
// gửi dùng được; nút kết nối ẩn (cần integrations.manage).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useEmailMktStyles } from '../styles/email-marketing.styles';
import { useSettingsUi } from '../settings-store';
import { MAIL_CONNECTORS, useTenantMail, type MailConnector } from '../hooks/useTenantMail';
import { ConnectIntegrationModal } from './ConnectIntegrationModal';
import { MailSenderStatus } from './email-marketing/MailSenderStatus';

const STEPS = [1, 2, 3, 4, 5] as const;

export function EmailMarketingSection() {
  const t = useTranslations('settings.emailMkt');
  const s = useSectionStyles().styles;
  const { styles, cx } = useEmailMktStyles();
  const set = useSettingsUi((x) => x.set);
  const mail = useTenantMail();
  const [plat, setPlat] = useState<MailConnector>('brevo');
  const card = mail.cards.find((c) => c.key === plat);
  const tint = card?.color ?? '';
  const senders = (mail.senders.data ?? []).filter((x) => x.connector === plat);
  return (
    <>
      <div className={styles.lead}>{t('lead')}</div>
      <div className={styles.bar} role="tablist" aria-label={t('providers')}>
        {MAIL_CONNECTORS.map((k) => {
          const c = mail.cards.find((x) => x.key === k);
          const on = plat === k;
          return (
            <button key={k} type="button" role="tab" aria-selected={on} className={cx(styles.plat, on && styles.platOn)} style={on && c ? { borderColor: c.color, color: c.color } : undefined} onClick={() => setPlat(k)} data-testid={`st-em-plat-${k}`}>
              <span className={styles.av} style={c ? { background: c.color } : undefined}>
                {t(`av.${k}`)}
              </span>
              {t(`name.${k}`)}
            </button>
          );
        })}
      </div>
      <div className={styles.card} data-testid="st-em-card" data-connector={plat}>
        <div className={styles.head}>
          <span className={styles.logo} style={tint ? { background: tint } : undefined}>
            {t(`av.${plat}`)}
          </span>
          <div className={styles.grow}>
            <div className={styles.t}>{t(`title.${plat}`)}</div>
            <div className={styles.s}>{t(`sub.${plat}`)}</div>
          </div>
          {card?.connected ? <span className={styles.on}>{t('connected')}</span> : null}
          {mail.canManage ? (
            <button type="button" className={card?.connected ? s.ghost : s.primary} onClick={() => set({ integModal: plat })} data-testid="st-em-connect">
              {t(card?.connected ? 'manage' : 'connect')}
            </button>
          ) : null}
        </div>
        {mail.canManage ? null : <div className={styles.muted}>{t('needManage')}</div>}
      </div>
      <div className={styles.steps}>
        <div className={styles.stepsT}>{t('stepsT')}</div>
        {STEPS.map((n) => (
          <div key={n} className={styles.step}>
            <span className={styles.n} style={tint ? { background: tint } : undefined}>
              {n}
            </span>
            <div className={styles.grow}>
              <div className={styles.stepT}>{t(`steps.${plat}.${n}.t`)}</div>
              <div className={styles.stepD}>{t(`steps.${plat}.${n}.d`)}</div>
            </div>
          </div>
        ))}
      </div>
      {mail.canCampaign ? (
        <div className={styles.card}>
          <div className={styles.t}>{t('sendersT')}</div>
          <PageStates state={stateOf(mail.senders)} onRetry={() => void mail.senders.refetch()}>
            <MailSenderStatus senders={senders} />
          </PageStates>
        </div>
      ) : null}
      <div className={styles.note}>{t(plat === 'smtp' ? 'noteSmtp' : 'noteBrevo')}</div>
      <ConnectIntegrationModal />
    </>
  );
}
