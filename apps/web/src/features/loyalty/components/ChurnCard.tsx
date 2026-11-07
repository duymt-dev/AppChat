// Thẻ "Cảnh báo khách sắp rời bỏ" — prototype L4447–4469 (lyChurn L11476). Chấm điểm rời bỏ (REQ-J05) là P2: chưa có điểm rủi ro thật
// nên thẻ giữ khung + ghi "Sắp có", không hiện điểm giả, không có nút no-op (TIP-036 mục 4). Có dữ liệu (P2) → bảng như prototype.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useLoyaltyStyles } from '../styles/loyalty.styles';
import { useTableStyles } from '../styles/tables.styles';
import { RISK_TONE, TIER_TONE } from '../status';
import type { LoyaltyOverview } from '../types';

const COLS = ['name', 'tier', 'risk', 'signal', 'last'] as const;

export function ChurnCard({ data }: { data: LoyaltyOverview }) {
  const t = useTranslations('loyalty');
  const { styles } = useLoyaltyStyles();
  const { styles: tb, cx } = useTableStyles();
  return (
    <div className={styles.card} data-testid="ly-churn">
      <div className={styles.cardH}>
        <span className={tb.bellIc}>
          <Icon name="ic-bell" size={16} color={color.hotText} strokeWidth={2} />
        </span>
        <div className={styles.grow}>
          <div className={styles.cardT}>{t('churn.title')}</div>
          <div className={styles.cardS}>{t('churn.sub')}</div>
        </div>
        {data.churn.length ? null : (
          <span className={tb.soon} data-testid="ly-churn-soon">
            {t('rules.soon')}
          </span>
        )}
      </div>
      {data.churn.length ? (
        <div className={tb.scroll}>
          <div className={tb.cHead}>
            {COLS.map((k) => (
              <span key={k}>{t(`churn.col.${k}`)}</span>
            ))}
          </div>
          {data.churn.map(([name, phone, tier, risk, score, signal, last]) => {
            const tone = TIER_TONE[tier] ?? color.slateAvatar;
            const rc = RISK_TONE[risk] ?? color.text3;
            return (
              <div key={phone} className={tb.cRow}>
                <div className={tb.who}>
                  <span className={tb.av} style={{ background: tone }}>
                    {name.split(' ').at(-1)?.charAt(0)}
                  </span>
                  <div className={tb.min0}>
                    <div className={tb.name}>{name}</div>
                    <div className={cx(tb.phone, tb.mono)}>{phone}</div>
                  </div>
                </div>
                <span>
                  <span className={tb.tier} style={{ background: `${tone}18`, color: tone }}>
                    {t(`tier.${tier}`)}
                  </span>
                </span>
                <div>
                  <div className={tb.riskRow}>
                    <span className={tb.risk} style={{ color: rc }}>
                      {t(`churn.risk.${risk}`)}
                    </span>
                    <span className={tb.score}>{t('churn.score', { n: score })}</span>
                  </div>
                  <div className={tb.bar}>
                    <div style={{ width: `${score}%`, background: rc }} />
                  </div>
                </div>
                <span className={tb.muted}>{signal}</span>
                <span className={tb.muted}>{last}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={tb.muted} data-testid="ly-churn-empty">
          {t('churn.soonD')}
        </div>
      )}
    </div>
  );
}
