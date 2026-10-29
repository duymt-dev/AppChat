// Thẻ "Cảnh báo khách sắp rời bỏ" — prototype L4447–4469 (lyChurn L11476): mức rủi ro + thanh điểm, dấu hiệu, lần cuối,
// "Tặng ưu đãi" (mở Marketing) · "Giao AI" · "Giao AI chăm sóc tất cả". Mock: không gọi agent thật.
'use client';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useLoyaltyStyles } from '../styles/loyalty.styles';
import { useTableStyles } from '../styles/tables.styles';
import { RISK_TONE, TIER_TONE } from '../status';
import type { LoyaltyOverview } from '../types';

const COLS = ['name', 'tier', 'risk', 'signal', 'last'] as const;
const MARKETING = '/marketing';

export function ChurnCard({ data }: { data: LoyaltyOverview }) {
  const t = useTranslations('loyalty');
  const { message } = App.useApp();
  const router = useRouter();
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
        <button type="button" className={styles.ghost} onClick={() => void message.info(t('churn.exporting'))}>
          {t('churn.export')}
        </button>
        <button type="button" className={styles.dark} onClick={() => void message.success(t('churn.aiAllDone', { n: data.churn.length }))} data-testid="ly-churn-ai-all">
          <Icon name="ic-spark" size={14} color={color.sparkMint} strokeWidth={1.9} />
          {t('churn.aiAll')}
        </button>
      </div>
      <div className={tb.scroll}>
        <div className={tb.cHead}>
          {COLS.map((k) => (
            <span key={k}>{t(`churn.col.${k}`)}</span>
          ))}
          <span className={tb.end}>{t('churn.col.act')}</span>
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
              <div className={tb.acts}>
                <button
                  type="button"
                  className={tb.chip}
                  onClick={() => (void message.info(t('churn.offerDone', { name })), router.push(MARKETING))}
                >
                  {t('churn.offer')}
                </button>
                <button type="button" className={cx(tb.chip, tb.chipAi)} onClick={() => void message.success(t('churn.assignDone', { name }))}>
                  <Icon name="ic-spark" size={12} color={color.brandInk} strokeWidth={2.2} />
                  {t('churn.assign')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
