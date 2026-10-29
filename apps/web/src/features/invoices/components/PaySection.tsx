// Khối thanh toán của tab Tổng quan — prototype L5273–5289: tiến độ thu (%), khoản thu (phiếu thu), VietQR khi còn phải thu (COMMERCE §5).
'use client';
import { QRCode } from 'antd';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useInvoiceTabStyles } from '../styles/tabs.styles';
import { useInvoicePayStyles } from '../styles/pay.styles';
import type { Invoice } from '../types';

const METHODS = ['qr', 'bank_transfer', 'cash', 'card'] as const;
const methodKey = (m: string) => ((METHODS as readonly string[]).includes(m) ? m : 'bank_transfer');

export function PayProgress({ i }: { i: Invoice }) {
  const t = useTranslations('invoices.detail');
  const fmt = useFmt();
  const { styles: tab } = useInvoiceTabStyles();
  const { styles } = useInvoicePayStyles();
  return (
    <div className={tab.card} data-testid="iv-progress">
      <div className={styles.barHead}>
        <span className={styles.barL}>{t('pay')}</span>
        <span data-testid="iv-pct">{`${i.paid_pct}%`}</span>
      </div>
      <div className={styles.bar}>
        {/* bề rộng = phần trăm đã thu — giá trị động */}
        <div style={{ width: `${i.paid_pct}%` }} />
      </div>
      <div className={styles.barFoot}>
        <span data-testid="iv-paid">
          {t.rich('paid', { v: fmt.money(i.paid_amount), b: (c) => <b>{c}</b> })}
        </span>
        <span className={styles.leftV} data-testid="iv-left">
          {t.rich('left', { v: fmt.money(i.left), b: (c) => <b>{c}</b> })}
        </span>
      </div>
    </div>
  );
}

export function PaymentList({ i }: { i: Invoice }) {
  const t = useTranslations('invoices');
  const fmt = useFmt();
  const { styles: tab } = useInvoiceTabStyles();
  const { styles, cx } = useInvoicePayStyles();
  return (
    <div className={cx(tab.card, styles.payCard)} data-testid="iv-payments">
      {i.payments.map((p) => {
        const args = { method: t(`method.${methodKey(p.method)}` as never), at: fmt.date(p.at), by: p.by };
        return (
          <div
            key={p.id}
            className={styles.payRow}
            title={t('detail.receipt', { code: p.receipt_code })}
            data-receipt={p.receipt_code}
          >
            <span className={styles.payIc}>
              <Icon name="ic-check" size={15} color={color.brandInk} strokeWidth={2} />
            </span>
            <div className={tab.grow}>
              <div className={styles.payAmt}>{fmt.money(p.amount)}</div>
              <div className={styles.payMeta}>
                {p.auto ? t('detail.payAuto', args) : t('detail.payMeta', args)}
              </div>
            </div>
          </div>
        );
      })}
      {i.payments.length ? null : <div className={styles.empty}>{t('detail.noPay')}</div>}
    </div>
  );
}

export function VietQrCard({ i }: { i: Invoice }) {
  const t = useTranslations('invoices');
  const fmt = useFmt();
  const { styles: tab } = useInvoiceTabStyles();
  const { styles } = useInvoicePayStyles();
  if (!i.qr) return null;
  const q = i.qr;
  return (
    <div className={tab.card} data-testid="iv-qr">
      <div className={tab.h}>{t('detail.qr')}</div>
      <div className={styles.qr}>
        <div className={styles.qrBox}>
          <QRCode value={q.payload} size={132} bordered={false} color={color.text} bgColor={color.white} />
        </div>
        <div className={styles.qrKv}>
          <span>
            {t('detail.qrBank')}
            <b>{q.bank}</b>
          </span>
          <span>
            {t('detail.qrAcc')}
            <b>{q.account_no}</b>
          </span>
          <span>
            {t('detail.qrName')}
            <b>{q.account_name}</b>
          </span>
          <span>
            {t('detail.qrAmount')}
            <b data-testid="iv-qr-amount">{fmt.money(q.amount)}</b>
          </span>
          <span>
            {t('detail.qrContent')}
            <b data-testid="iv-qr-content">{q.content}</b>
          </span>
        </div>
      </div>
      <div className={styles.qrHint}>{t('detail.qrHint', { code: q.content })}</div>
      <div className={styles.legal} data-testid="iv-not-vat">
        {t('notVat')}
      </div>
    </div>
  );
}
