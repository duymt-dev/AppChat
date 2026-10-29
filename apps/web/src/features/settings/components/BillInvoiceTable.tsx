// "Lịch sử hóa đơn" gói AppChat — prototype L5961–5986: tìm mã / tên gói, lọc trạng thái + khoảng ngày, 7 cột; hoá đơn chưa thanh toán
// (pending / hết hạn) có "Thanh toán" → mở hộp QR (hết hạn → billing.create_invoice lại cùng mặt hàng); "Xem" mở chi tiết.
// Trạng thái theo billing_invoice (Blueprint §2.2): pending · pending_review · paid · expired · cancelled.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useBillingStyles } from '../styles/billing.styles';
import { billInvoicesQuery } from '../api';
import { useBillingUi } from '../billing-store';
import { useBuy } from '../hooks/useBuy';
import type { BillInvoice, BillInvoiceStatus } from '../types';

const STATUSES: BillInvoiceStatus[] = ['paid', 'pending', 'pending_review', 'expired', 'cancelled'];
const ST_COLOR: Record<BillInvoiceStatus, [string, string]> = {
  paid: [color.brandInk, color.billPaidBg],
  pending: [color.amberText, color.amberBg],
  pending_review: [color.amberText, color.amberBg],
  expired: [color.dangerDeep, color.roseBg],
  cancelled: [color.text3, color.muteBg],
};
const ARROW = '→';
const DATE_PH = 'dd/mm/yyyy';

/** dd/mm/yyyy → yyyy-mm-dd (rỗng / sai định dạng → ''). */
const iso = (v: string) => {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

export function BillInvoiceTable() {
  const t = useTranslations('settings.billing.inv');
  const fmt = useFmt();
  const { styles } = useBillingStyles();
  const { invStatus, invQ, invFrom, invTo, set } = useBillingUi();
  const q = useQuery(billInvoicesQuery({ status: invStatus, q: invQ }));
  const { buy } = useBuy();
  const from = iso(invFrom);
  const to = iso(invTo);
  const rows = (q.data?.data ?? []).filter((i) => (!from || i.date >= from) && (!to || i.date <= to));
  const pay = (i: BillInvoice) => (i.status === 'expired' ? void buy(i.kind, i.item) : set({ invoiceId: i.id }));
  return (
    <div className={styles.table} data-testid="st-bill-invoices">
      <div className={styles.bar2}>
        <div className={styles.tt}>{t('title')}</div>
        <div className={styles.search}>
          <Icon name="ic-search" size={13} color={color.text4} />
          <input value={invQ} onChange={(e) => set({ invQ: e.target.value })} placeholder={t('search')} aria-label={t('search')} data-testid="st-bill-search" />
        </div>
        <select className={styles.select} value={invStatus} onChange={(e) => set({ invStatus: e.target.value })} aria-label={t('status')} data-testid="st-bill-status">
          <option value="all">{t('all')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`st.${s}`)}
            </option>
          ))}
        </select>
        <input className={styles.date} value={invFrom} onChange={(e) => set({ invFrom: e.target.value })} placeholder={DATE_PH} aria-label={t('from')} data-testid="st-bill-from" />
        <span className={styles.arrow}>{ARROW}</span>
        <input className={styles.date} value={invTo} onChange={(e) => set({ invTo: e.target.value })} placeholder={DATE_PH} aria-label={t('to')} />
        <span className={styles.count}>{t('count', { n: rows.length })}</span>
      </div>
      <div className={styles.th}>
        <span>{t('col.code')}</span>
        <span>{t('col.pkg')}</span>
        <span>{t('col.date')}</span>
        <span className={styles.r}>{t('col.amount')}</span>
        <span>{t('col.method')}</span>
        <span>{t('col.status')}</span>
        <span className={styles.r}>{t('col.invoice')}</span>
      </div>
      <PageStates state={stateOf(q, () => rows.length === 0)} onRetry={() => void q.refetch()}>
        {rows.map((i) => {
          const [fg, bg] = ST_COLOR[i.status];
          const unpaid = i.status === 'pending' || i.status === 'expired';
          return (
            <div key={i.id} className={styles.tr} data-invoice={i.id} data-status={i.status}>
              <span className={styles.code}>{i.code}</span>
              <span className={styles.pkg}>{i.desc}</span>
              <span className={styles.dt}>{fmt.date(i.date)}</span>
              <span className={styles.amt}>{fmt.money(i.amount)}</span>
              <span className={styles.method}>{t(`method.${i.method}`)}</span>
              <span>
                <span className={styles.st} style={{ color: fg, background: bg }}>
                  {t(`st.${i.status}`)}
                </span>
              </span>
              <div className={styles.acts}>
                {unpaid ? (
                  <button type="button" className={styles.pay} onClick={() => pay(i)} data-testid={`st-bill-pay-${i.id}`}>
                    {t('pay')}
                  </button>
                ) : null}
                <button type="button" className={styles.view} onClick={() => set({ invoiceId: i.id })} aria-label={t('view') + ' ' + i.code}>
                  <Icon name="ic-dl" size={12} color={color.text3} />
                  {t('view')}
                </button>
              </div>
            </div>
          );
        })}
      </PageStates>
    </div>
  );
}
