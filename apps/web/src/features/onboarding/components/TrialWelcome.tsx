// Màn chào mừng trial (một lần, sau khai báo) — prototype L677–714. Ngoại lệ: 15 ngày (không phải 14), ngày hết hạn theo fmt.date.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useOnbStyles } from '../onboarding.styles';
import { useTrialStyles } from '../trial.styles';

const PERKS = ['1', '2', '3', '4'] as const;

export interface TrialWelcomeProps {
  trialEndsAt: number;
  onStart: () => void;
  onPricing: () => void;
}

export function TrialWelcome({ trialEndsAt, onStart, onPricing }: TrialWelcomeProps) {
  const t = useTranslations('onboarding.welcome');
  const fmt = useFmt();
  const { styles: o, cx } = useOnbStyles();
  const { styles } = useTrialStyles();
  const date = fmt.date(trialEndsAt);
  return (
    <div className={cx(o.veil, o.veilDark, styles.welcomeZ)} data-testid="trial-welcome" role="dialog" aria-modal="true">
      <div className={styles.card} data-testid="onb-card">
        <div className={styles.hero}>
          <div className={styles.ring} />
          <div className={styles.rel}>
            <div className={styles.eyebrow}>
              <span className={styles.mark}>{t('mark')}</span>
              <span className={styles.eyebrowText}>{t('eyebrow')}</span>
            </div>
            <div className={styles.heroTitle}>{t('title')}</div>
            <div className={styles.heroBody}>{t.rich('body', { date, b: (c) => <b>{c}</b> })}</div>
          </div>
        </div>
        <div className={styles.body}>
          <div className={styles.box}>
            <div className={styles.days}>{t('days')}</div>
            <div className={styles.minw}>
              <div className={styles.boxTitle}>{t('boxTitle')}</div>
              <div className={styles.boxSub}>{t.rich('boxSub', { date, b: (c) => <b>{c}</b> })}</div>
            </div>
          </div>
          <div className={styles.list}>
            {PERKS.map((k) => (
              <div key={k} className={styles.perk}>
                <Icon name="ic-check" size={15} strokeWidth={2.3} color={color.brand} />
                {t(`perks.${k}`)}
              </div>
            ))}
          </div>
          <button type="button" className={styles.cta} onClick={onStart} data-testid="trial-start">
            {t('start')}
            <Icon name="ic-arrow" size={16} strokeWidth={2.2} color={color.white} />
          </button>
          <button type="button" className={styles.ghost} onClick={onPricing} data-testid="trial-pricing">
            {t('pricing')}
          </button>
          <div className={styles.foot}>{t('note')}</div>
        </div>
      </div>
    </div>
  );
}
