// Popup Nâng cấp — prototype L985–1027 (REQ-L06): Cá nhân / Doanh nghiệp, băng dùng thử (còn N ngày), 4 thẻ gói lớn, bảng so sánh.
// Bỏ nút "Mô phỏng hết hạn" (công cụ demo) và 3 thẻ "Ngân sách Token / Mua thêm tài nguyên / tính năng" (nằm ở Ví — REQ-L05; Call Center,
// White-label, API là OUT). Mở bằng ?upgrade=1 (rail "Nâng cấp", trial welcome / expired) hoặc nút Gia hạn.
'use client';
import { useQuery } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useUpgradeStyles } from '../styles/upgrade.styles';
import { billingPlansQuery } from '../api';
import { useBillingUi } from '../billing-store';
import { PlanCards } from './PlanCards';
import { PlanCompare, PlanSeg } from './PlanCompare';

const TRIAL_DAYS = 15;
const TRIAL_PLAN = 'personal_pro';

export function UpgradeModal({ trialDays, current }: { trialDays: number; current?: string }) {
  const t = useTranslations('settings.billing.upgrade');
  const { message } = App.useApp();
  const { styles } = useUpgradeStyles();
  const { upgradeOpen, cmpSeg, set } = useBillingUi();
  const q = useQuery({ ...billingPlansQuery(), enabled: upgradeOpen });
  if (!upgradeOpen || !q.data) return null;
  const close = () => set({ upgradeOpen: false });
  const pct = Math.max(0, Math.min(100, Math.round((trialDays / TRIAL_DAYS) * 100)));
  return (
    <div className={styles.veil} onClick={close} data-testid="upgrade-modal">
      <div className={styles.card} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.grow}>
            <div className={styles.t}>{t('title')}</div>
            <div className={styles.s}>{t('sub')}</div>
          </div>
          <div className={styles.segWrap}>
            <PlanSeg small value={cmpSeg} onChange={(s) => set({ cmpSeg: s })} />
          </div>
          <button type="button" className={styles.x} onClick={close} aria-label={t('close')}>
            <Icon name="ic-x" size={16} color={color.text4} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.body}>
          {trialDays > 0 ? (
            <div className={styles.trial} data-testid="upgrade-trial">
              <div className={styles.days}>{trialDays}</div>
              <div className={styles.grow}>
                <div className={styles.trT}>{t('trialT', { n: trialDays })}</div>
                <div className={styles.trS}>{t('trialS')}</div>
              </div>
              <div className={styles.bar}>
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : null}
          <PlanCards big plans={q.data.plans[cmpSeg]} trial={{ key: TRIAL_PLAN, days: trialDays }} current={current} onContact={() => void message.info(t('contacted'))} />
          <div className={styles.cmp}>
            <PlanCompare cat={q.data} />
          </div>
        </div>
      </div>
    </div>
  );
}
