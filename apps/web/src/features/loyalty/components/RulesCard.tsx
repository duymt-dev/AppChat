// Thẻ "Quy tắc tích điểm" — prototype L4472–4490 (lyRules L11483). Theo COMMERCE §7: chỉ 2 quy tắc chạy (10.000đ = 1 điểm khi đơn hoàn tất ·
// nhân hệ số hạng); các thưởng ngoài luật hiện "Sắp có", không bật được. "Cấu hình hạng & điểm" thay cho builder KHI/NẾU/THÌ (loyalty.update_config).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { useLoyaltyStyles } from '../styles/loyalty.styles';
import { useTableStyles } from '../styles/tables.styles';
import { useLoyaltyUi } from '../loyalty-store';
import type { LoyaltyOverview } from '../types';

const LOOK: Record<string, [IconName, string]> = {
  earn: ['ic-plus', color.successStrong],
  tier_mult: ['ic-gift', color.amberGold],
  big_order: ['ic-spark', color.blue],
  birthday: ['ic-gift', color.pink],
  signup: ['ic-check', color.violet],
  referral: ['ic-send', color.tealInk],
  rating: ['ic-check', color.slateAvatar],
  package: ['ic-box', color.amberGold],
};
const COLS = ['when', 'if', 'then', 'expiry'] as const;

export function RulesCard({ data }: { data: LoyaltyOverview }) {
  const t = useTranslations('loyalty.rules');
  const { styles, cx } = useLoyaltyStyles();
  const tb = useTableStyles().styles;
  const set = useLoyaltyUi((s) => s.set);
  const canConfig = useCan('loyalty.config');
  const on = data.rules.filter((r) => r[5] === 'on').length;
  return (
    <div className={styles.card} data-testid="ly-rules">
      <div className={styles.cardH}>
        <div className={styles.grow}>
          <div className={styles.cardT}>{t('title')}</div>
          <div className={styles.cardS}>{t.rich('sub', { b: (c) => <b>{c}</b> })}</div>
        </div>
        {canConfig ? (
          <button type="button" className={styles.primary} onClick={() => set({ config: true })} data-testid="ly-config-open">
            <Icon name="ic-cog" size={14} color={color.white} strokeWidth={2} />
            {t('config')}
          </button>
        ) : null}
      </div>
      <div className={tb.scroll}>
        <div className={tb.rHead}>
          <span>{t('col.prio')}</span>
          {COLS.map((k) => (
            <span key={k}>{t(`col.${k}`)}</span>
          ))}
          <span className={tb.end}>{t('col.state')}</span>
        </div>
        {data.rules.map(([k, trig, cond, calc, expiry, state], i) => {
          const [ic, c] = LOOK[k] ?? LOOK.earn!;
          const running = state === 'on';
          return (
            <div key={k} className={tb.rRow} data-rule={k} data-state={state}>
              <span className={tb.prio}>{i + 1}</span>
              <div className={tb.who}>
                <span className={tb.ruleIc} style={{ background: `${c}18` }}>
                  <Icon name={ic} size={13} color={c} strokeWidth={1.9} />
                </span>
                <div className={tb.min0}>
                  <div className={tb.ruleN}>{t(`name.${k}`)}</div>
                  <div className={tb.ruleT}>{t(`trigger.${trig}`)}</div>
                </div>
              </div>
              <div className={tb.conds}>
                <span className={tb.cond}>{t(`cond.${cond}`)}</span>
              </div>
              <span className={tb.calc}>{calc}</span>
              <span className={tb.muted}>{expiry}</span>
              <div className={tb.stateRow}>
                {running ? (
                  <span className={tb.sw} style={{ background: color.brand }} title={t('on')}>
                    <span className={tb.swOn} />
                  </span>
                ) : (
                  <span className={tb.soon}>{t('soon')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className={cx(styles.foot, styles.footMuted)}>
        <span>{t.rich('foot', { on, n: data.rules.length, b: (c) => <b>{c}</b> })}</span>
        <span className={styles.grow} />
        <button type="button" className={styles.ghost} onClick={() => set({ sim: true })} data-testid="ly-sim-open">
          <Icon name="ic-play" size={14} color={color.blue} strokeWidth={1.9} />
          {t('sim')}
        </button>
      </div>
    </div>
  );
}
