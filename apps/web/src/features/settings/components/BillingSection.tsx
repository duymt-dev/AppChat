// Mục Gói & thanh toán — prototype L5947–5987 (REQ-L05): thẻ gói hiện tại (ngày kích hoạt / hết hạn, người dùng, kênh, credit gói tháng)
// + "Gia hạn" (mở popup Nâng cấp), lịch sử hoá đơn gói. Bỏ nút "Demo: hết hạn" (công cụ demo). "Token còn lại" → credit (REQ-L01).
// Vào từ ví / rail "Nâng cấp" (?upgrade=1 mở popup) — quyền billing.manage.
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useBillingStyles } from '../styles/billing.styles';
import { billingSummaryQuery } from '../api';
import { useBillingUi } from '../billing-store';
import type { BillingSummary, QuotaUsage } from '../types';
import { BillInvoiceTable } from './BillInvoiceTable';
import { BillingModals } from './BillingModals';

const BRAND = 'AppChat';
const SLASH = ' / ';
const DASH = '—';

function Hero({ s }: { s: BillingSummary }) {
  const t = useTranslations('settings.billing');
  const fmt = useFmt();
  const { styles } = useBillingStyles();
  const set = useBillingUi((x) => x.set);
  const pct = (a: number, b: number) => `${Math.round((a / b) * 100)}%`;
  // Hạn mức gồm addon (TIP-039); `max` null = không giới hạn; kênh đọc DB tenant lỗi → "—" (không giả 0).
  const quota = (u: QuotaUsage, left: (n: number) => string) =>
    u.available === false
      ? { v: DASH, sub: t('hero.unavailable') }
      : u.max === null
        ? { v: String(u.used), sub: t('hero.unlimited') }
        : { v: u.used + SLASH + u.max, w: pct(u.used, u.max), sub: left(Math.max(0, u.max - u.used)) };
  const stats: { l: string; v: string; w?: string; sub?: string }[] = [
    { l: t('hero.activated'), v: fmt.date(s.activated_at) },
    { l: t('hero.expires'), v: fmt.date(s.expires_at), w: `${s.period_pct}%`, sub: t('hero.daysLeft', { n: s.days_left }) },
    { l: t('hero.users'), ...quota(s.users, (n) => t('hero.seatsLeft', { n })) },
    { l: t('hero.channels'), ...quota(s.channels, (n) => t('hero.chLeft', { n })) },
    {
      l: t('hero.credits'),
      v: fmt.number(s.plan_balance) + SLASH + fmt.number(s.credits_month),
      w: pct(s.plan_balance, s.credits_month),
      sub: t('hero.reset'),
    },
  ];
  return (
    <div className={styles.hero} data-testid="st-bill-hero">
      <div className={styles.top}>
        <div className={styles.grow}>
          <div className={styles.eyebrow}>{t('hero.current')}</div>
          <div className={styles.name}>
            <span>{BRAND}</span>
            <span className={styles.mint} data-testid="st-bill-plan">
              {s.plan_name}
            </span>
            <span className={styles.live}>{t(`hero.st.${s.status}`)}</span>
          </div>
        </div>
        <button type="button" className={styles.renew} onClick={() => set({ upgradeOpen: true })} data-testid="st-bill-renew">
          <Icon name="ic-spark" size={14} color={color.white} strokeWidth={1.9} />
          {t('hero.renew')}
        </button>
      </div>
      <div className={styles.stats}>
        {stats.map((x) => (
          <div key={x.l}>
            <div className={styles.l}>{x.l}</div>
            <div className={styles.v}>{x.v}</div>
            {x.w ? (
              <>
                <div className={styles.bar}>
                  <span style={{ width: x.w }} />
                </div>
                <div className={styles.sub}>{x.sub}</div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function BillingSection() {
  const q = useQuery(billingSummaryQuery());
  const sp = useSearchParams();
  const set = useBillingUi((x) => x.set);
  useEffect(() => {
    if (sp.get('upgrade') === '1') set({ upgradeOpen: true });
  }, [sp, set]);
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? (
        <>
          <Hero s={q.data} />
          <BillInvoiceTable />
        </>
      ) : null}
      <BillingModals />
    </PageStates>
  );
}
