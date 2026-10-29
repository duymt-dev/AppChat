// 4 thẻ gói theo phân khúc — dùng ở Ví (gọn, L6482) và popup Nâng cấp (lớn, L1002). Gói đang dùng thử hiện "ĐANG DÙNG THỬ" + nút tắt;
// Miễn phí: nút tắt; Enterprise (giá null): "Liên hệ" → gửi yêu cầu qua hỗ trợ; còn lại "Chọn gói" → billing.create_invoice (kind plan).
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { usePlanStyles } from '../styles/plans.styles';
import { useBuy } from '../hooks/useBuy';
import type { Plan } from '../types';

interface Props {
  plans: Plan[];
  big?: boolean;
  /** key gói đang dùng thử + số ngày còn lại (trial 15 ngày gói Cá nhân Pro — D-trial). */
  trial?: { key: string; days: number };
  current?: string;
  onContact: () => void;
}

export function PlanCards({ plans, big, trial, current, onContact }: Props) {
  const t = useTranslations('settings.billing.plan');
  const fmt = useFmt();
  const { styles, cx } = usePlanStyles();
  const { buy, pending } = useBuy();
  return (
    <div className={styles.grid} data-testid="plan-cards">
      {plans.map((p) => {
        const onTrial = trial?.key === p.key && trial.days > 0;
        const isCur = current === p.key;
        const free = p.price === '0';
        const hot = onTrial || p.popular;
        const cta = onTrial ? t('trialCta', { n: trial!.days }) : free ? t('freeCta') : isCur ? t('current') : p.price === null ? t('contact') : t('choose');
        return (
          <div key={p.key} className={cx(styles.card, big && styles.big, hot && styles.hot)} data-plan={p.key}>
            {onTrial && big ? <span className={styles.trialTag}>{t('trialTag')}</span> : p.popular && !onTrial ? <span className={cx(styles.pop, big && styles.popBig)}>{t(big ? 'popularBig' : 'popular')}</span> : null}
            <div className={cx(styles.n, big && styles.nBig)}>{p.name}</div>
            <div className={cx(styles.d, big && styles.dBig)}>{p.desc}</div>
            <div className={styles.price}>
              <span className={cx(styles.p, big && styles.pBig)}>{p.price === null ? t('contact') : free ? t('free') : fmt.money(p.price)}</span>
              {p.period ? <span className={cx(styles.u, big && styles.uBig)}> {t(`per.${p.period}`)}</span> : null}
            </div>
            <div className={cx(styles.feats, big && styles.featsBig)}>
              {p.features.map((f) => (
                <div key={f} className={styles.f}>
                  <Icon name="ic-check" size={13} color={color.brand} strokeWidth={2.2} />
                  {f}
                </div>
              ))}
            </div>
            <button
              type="button"
              className={cx(styles.cta, big && styles.ctaBig, free && styles.ctaFree, onTrial && styles.ctaTrial)}
              disabled={onTrial || free || isCur || pending}
              onClick={() => (p.price === null ? onContact() : void buy('plan', p.key))}
              data-testid={`plan-cta-${p.key}`}
            >
              {cta}
            </button>
          </div>
        );
      })}
    </div>
  );
}
