// Tab "Tổng quan" của Hồ sơ 360° — prototype L2025–2093: hành trình · AI tóm tắt · thông tin khách · deal · lịch sử · việc · ghi chú · comment.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { usePanelStyles } from '../styles/panel.styles';
import { useCardStyles } from '../styles/card360.styles';
import { Rich } from './Rich';
import { Timeline } from './Timeline';
import { ExtraCards } from './ExtraCards';
import type { Contact360 } from '../types';

export function Overview360({ c }: { c: Contact360 }) {
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
        <div className={styles.cardHead}>
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
          <button type="button" className={styles.link}>
            {t('edit')}
          </button>
        </div>
        <div className={cs.person}>
          <div className={cs.bigAvatar} style={{ background: c.avatar_color }}>
            {c.initials}
          </div>
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
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('deal')}</span>
          <button type="button" className={styles.link}>
            {t('add')}
          </button>
        </div>
        <div className={cs.pname}>{c.deal.title}</div>
        <div className={styles.kv}>
          {t('dealValue')}
          <b>{fmt.money(c.deal.value)}</b>
        </div>
        <div className={styles.kv}>
          {t('dealStage')}
          <span className={styles.chip} style={{ color: color.dealText, background: color.dealBg }}>
            {c.deal.stage}
          </span>
        </div>
        <div className={styles.kv}>
          {t('dealProb')}
          <b>{c.deal.probability}%</b>
        </div>
        <div className={styles.kv}>
          {t('dealClose')}
          <b>{c.deal.close_date}</b>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.eyebrow}>{t('history')}</span>
          <button type="button" className={styles.link}>
            {t('exportCsv')}
          </button>
        </div>
        <Timeline items={c.history} />
      </div>
      <ExtraCards c={c} />
    </>
  );
}
