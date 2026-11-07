// Thẻ "Tổng quan điểm & doanh thu" — prototype L4426–4434 (lyOverview L11475): 5 ô số liệu với xu hướng so tháng trước.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useLoyaltyStyles } from '../styles/loyalty.styles';
import type { LoyaltyOverview } from '../types';

const LOOK: Record<string, [IconName, string]> = {
  issued: ['ic-gift', color.lyGold],
  used: ['ic-check', color.sky],
  redeemed: ['ic-spark', color.purple],
  return: ['ic-flow', color.successStrong],
  revenue: ['ic-chart', color.lyOrange],
};

export function OverviewCard({ data }: { data: LoyaltyOverview }) {
  const t = useTranslations('loyalty.ov');
  const { styles, cx } = useLoyaltyStyles();
  return (
    <div className={cx(styles.card, styles.cardPad)} data-testid="ly-overview">
      <div className={styles.cardT}>{t('title')}</div>
      <div className={styles.ovGrid}>
        {data.overview.map(([k, v, u, d]) => {
          const [ic, c] = LOOK[k] ?? LOOK.issued!;
          return (
            <div key={k} className={styles.ov}>
              <span className={styles.ovIc} style={{ background: `${c}18` }}>
                <Icon name={ic} size={14} color={c} />
              </span>
              <div className={styles.ovL}>{t(k)}</div>
              <div className={styles.ovV} style={{ color: c }}>
                {v}
                {u ? <span className={styles.ovU}>{` ${t(`unit.${u}`)}`}</span> : null}
              </div>
              <div className={styles.ovT}>{t('trend', { v: d })}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
