// Mục Ví AppChat — prototype L6463–6610 (REQ-L01, L05, L07): số dư credit (credit gói + credit mua thêm — Blueprint §2.2 credit_wallet),
// "Nạp tiền" → hộp chọn gói credit; thẻ phụ: nhắc khi đã dùng 80% / 95% thay "tự nạp" (bỏ — D24) và hết credit thì AI tạm dừng (D09, thay
// "tự chuyển model tiết kiệm"). Tab: Nạp tiền (WalletShop) · Lịch sử ví (credit_ledger) · Hoá đơn (hoá đơn gói). ?topup=1 mở hộp nạp.
'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useWalletStyles } from '../styles/wallet.styles';
import { walletQuery } from '../api';
import { useBillingUi } from '../billing-store';
import type { WalletData } from '../types';
import { BillInvoiceTable } from './BillInvoiceTable';
import { BillingModals } from './BillingModals';
import { Switch } from './Switch';
import { WalletLedger } from './WalletLedger';
import { WalletShop } from './WalletShop';

const TABS = ['topup', 'history', 'invoice'] as const;

function Top({ w }: { w: WalletData }) {
  const t = useTranslations('settings.wallet');
  const fmt = useFmt();
  const { styles } = useWalletStyles();
  const set = useBillingUi((s) => s.set);
  const alerts = useAction('wallet.update_alerts');
  return (
    <div className={styles.top}>
      <div className={styles.bal} data-testid="st-wal-hero">
        <div className={styles.eyebrow}>{t('balance')}</div>
        <div className={styles.amount} data-testid="st-wal-balance">
          {fmt.number(w.plan_balance + w.topup_balance)}
          <span> {t('unit')}</span>
        </div>
        <div className={styles.balS}>{t('balS', { plan: fmt.number(w.plan_balance), topup: fmt.number(w.topup_balance), d: w.days_estimate })}</div>
        <button type="button" className={styles.topup} onClick={() => set({ creditOpen: true })} data-testid="st-wal-topup">
          <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2} />
          {t('topup')}
        </button>
      </div>
      <div className={styles.side}>
        <div className={styles.sideRow}>
          <div className={styles.grow}>
            <div className={styles.sT}>{t('alertT')}</div>
            <div className={styles.sS}>{t('alertS')}</div>
          </div>
          <Switch large on={w.low_alert} onChange={(v) => void alerts.run({ low_alert: v }, { silent: true })} label={t('alertT')} testId="st-wal-alert" />
        </div>
        <div className={styles.note}>
          <Icon name="ic-bell" size={14} color={color.amberText} strokeWidth={1.9} />
          {t('outNote')}
        </div>
      </div>
    </div>
  );
}

export function WalletSection() {
  const t = useTranslations('settings.wallet');
  const { styles } = useWalletStyles();
  const q = useQuery(walletQuery());
  const { walTab, set } = useBillingUi();
  const sp = useSearchParams();
  useEffect(() => {
    if (sp.get('topup') === '1') set({ creditOpen: true });
  }, [sp, set]);
  return (
    <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
      {q.data ? (
        <>
          <Top w={q.data} />
          <div className={styles.tabs} role="tablist">
            {TABS.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={walTab === k} onClick={() => set({ walTab: k })} data-testid={`st-wal-tab-${k}`}>
                {t(`tab.${k}`)}
              </button>
            ))}
          </div>
          {walTab === 'topup' ? <WalletShop /> : walTab === 'history' ? <WalletLedger /> : <BillInvoiceTable />}
        </>
      ) : null}
      <BillingModals />
    </PageStates>
  );
}
