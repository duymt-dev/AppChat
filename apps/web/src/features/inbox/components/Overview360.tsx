// Tab "Tổng quan" của Hồ sơ 360° — prototype L2025–2093: hành trình · AI tóm tắt · thông tin khách · deal · lịch sử · việc · ghi chú · comment.
// Deal / việc / ghi chú / comment = hoạt động CRM thật (TIP-026b, shared/contact-activities).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { CustomFieldList } from '@/shared/custom-fields';
import { usePanelStyles } from '../styles/panel.styles';
import { useCardStyles } from '../styles/card360.styles';
import { Rich } from './Rich';
import { Timeline } from './Timeline';
import { ExtraCards } from './ExtraCards';
import type { Contact360 } from '../types';
import { AvatarFace } from './AvatarFace';
import { HistoryCsvButton } from './HistoryCsvButton';
import { useCan } from '@/shared/authz/useCan';
import { useContactEditUi } from '@/shared/crm-forms/contact-edit-command';
import { DealCard } from '@/shared/contact-activities';
import { CustomerPackagesCard } from '@/shared/customer-packages';

/** `packages` = hiện thẻ Liệu trình (TIP-033b §4.4); tắt khi tab Tổng quan đã cấu hình khối `packages` để không trùng thẻ. */
export function Overview360({ c, packages = true }: { c: Contact360; packages?: boolean }) {
  // TIP-025b §D.3: "Sửa" mở form sửa toàn cục (ContactFormHost) — ẩn khi không có crm.edit; host kiểm lại quyền ghi theo bản ghi.
  const canEdit = useCan('crm.edit');
  const openEdit = useContactEditUi((s) => s.open);
  const t = useTranslations('inbox.p360');
  const fmt = useFmt();
  const { styles, cx } = usePanelStyles();
  const { styles: cs } = useCardStyles();
  const facts: [IconName, string][] = [
    ['ic-phone', c.phone],
    ['ic-box', c.company],
    ['ic-mail', c.email],
    ['ic-users', c.role],
  ];

  return (
    <>
      <div className={styles.card}>
        <div className={cx(styles.cardHead, styles.cardHeadTight)}>
          <span className={styles.eyebrow}>{t('journey')}</span>
          <span className={cx(styles.chip, styles.chipEnd)} style={{ color: color.amberGold, background: color.amberGoldBg }}>
            {t('stageAt', { stage: c.journey.stage })}
          </span>
        </div>
        <div className={styles.hint}>
          <span className={styles.hintLabel}>{t('spark')}</span>
          <div>
            <b className={styles.hintLabel}>{t('aiHint')}</b> {c.journey.hint}
          </div>
        </div>
      </div>
      <div className={styles.card} data-testid="p360-summary">
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('aiSummary')}</span>
          <span className={styles.chip} style={{ color: color.hotLeadText, background: color.hotLeadBg }}>
            {c.ai_summary.badge}
          </span>
        </div>
        <div className={styles.row}>
          <div>
            <div className={cs.ring}>
              <svg viewBox="0 0 92 92" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
                <circle cx="46" cy="46" r="40" fill="none" stroke={color.divider} strokeWidth="7" />
                <circle cx="46" cy="46" r="40" fill="none" stroke={color.brand} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c.ai_summary.close_pct} 100`} pathLength={100} />
              </svg>
              <div className={cs.ringNum}>
                {c.ai_summary.close_pct}
                <span className={cs.ringPct}>%</span>
              </div>
            </div>
            <div className={styles.small}>{t('closeChance')}</div>
          </div>
          <ul className={cs.bullets}>
            {c.ai_summary.bullets.map((b) => (
              <li key={b}>
                • <Rich text={b} toneClass={{ ok: styles.ok }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.card} data-testid="p360-contact">
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('contact')}</span>
          {canEdit ? (
            <button type="button" className={styles.link} onClick={() => openEdit(c.id)} data-testid="p360-edit">
              {t('edit')}
            </button>
          ) : null}
        </div>
        <div className={cs.person}>
          <AvatarFace className={cs.bigAvatar} background={c.avatar_color} src={c.avatar_url}>
            {c.initials}
          </AvatarFace>
          <div className={styles.grow}>
            <div className={cs.nameRow}>
              <span className={cs.pname}>{c.name}</span>
              <span className={cs.tier}>{c.tier}</span>
            </div>
            <div className={cs.since}>{c.since}</div>
            <span className={styles.badge}>{c.stage_label}</span>
          </div>
          <div className={cs.score}>
            <div className={styles.small}>{t('leadScore')}</div>
            <span className={cs.scoreNum}>{c.lead_score}</span> <span className={styles.chip} style={{ color: color.brandInk, background: color.brandBg }}>{c.lead_level}</span>
          </div>
        </div>
        <div className={cs.facts}>
          {facts.map(([ic, v]) => (
            <div key={ic} className={cs.fact}>
              <Icon name={ic} size={15} color={color.text4} />
              <span>{v}</span>
            </div>
          ))}
        </div>
        <div className={cs.loyalty}>
          <span className={cs.loyaltyIcon}>
            <Icon name="ic-star" size={17} color={color.white} />
          </span>
          <div className={styles.grow}>
            <div className={cs.loyaltyEyebrow}>{t('tier')}</div>
            <div className={cs.loyaltyTier}>{c.tier}</div>
          </div>
          <div>
            <div className={cs.points}>{fmt.number(c.points)}</div>
            <div className={cs.pointsSub}>{t('points', { value: fmt.money(c.points_value) })}</div>
          </div>
        </div>
      </div>
      <DealCard contactId={c.id} a={c.activities} />
      {packages ? <CustomerPackagesCard contactId={c.id} /> : null}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('history')}</span>
          <HistoryCsvButton contactId={c.id} />
        </div>
        <Timeline items={c.history} />
      </div>
      <ExtraCards c={c} />
      <div className={styles.card} data-custom-field="p360">
        <CustomFieldList entity="contact" values={c.custom} />
      </div>
    </>
  );
}
