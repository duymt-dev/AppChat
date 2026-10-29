// Cột DataTable Đề nghị thanh toán — prototype L5248 (Mã · Khách hàng · Nội dung · Giá trị · Trạng thái · Ngày phát hành · Người lập) + thẻ mobile.
'use client';
import { useTranslations } from 'next-intl';
import type { TableColumnsType } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useInvoiceCellStyles } from './styles/cells.styles';
import { STATUS_TONE } from './status';
import type { Invoice } from './types';

export function StatusChip({ i, testId }: { i: Invoice; testId?: string }) {
  const t = useTranslations('invoices.status');
  const { styles } = useInvoiceCellStyles();
  const [fg, bg] = STATUS_TONE[i.status];
  return (
    <span className={styles.status} style={{ color: fg, background: bg }} data-testid={testId}>
      {t(i.status)}
    </span>
  );
}

/** Giá trị kiểu prototype "18,5tr" (KPI). */
export function useTr() {
  const t = useTranslations('invoices');
  const fmt = useFmt();
  return (v: string) => t('tr', { n: fmt.number(Math.round(Number(v) / 100_000) / 10) });
}

export function useInvoiceColumns(): TableColumnsType<Invoice> {
  const t = useTranslations('invoices.col');
  const fmt = useFmt();
  const { styles } = useInvoiceCellStyles();
  return [
    { key: 'code', title: t('code'), width: 122, render: (_, i) => <b className={styles.code}>{i.code}</b> },
    {
      key: 'cust',
      title: t('cust'),
      render: (_, i) => <span className={styles.cust}>{i.contact_name}</span>,
    },
    { key: 'svc', title: t('svc'), render: (_, i) => <span className={styles.muted}>{i.title}</span> },
    {
      key: 'value',
      title: t('value'),
      render: (_, i) => <b className={styles.value}>{fmt.money(i.amount)}</b>,
    },
    { key: 'status', title: t('status'), width: 152, render: (_, i) => <StatusChip i={i} /> },
    {
      key: 'at',
      title: t('at'),
      width: 122,
      render: (_, i) => <span className={styles.muted}>{fmt.date(i.issued_at)}</span>,
    },
    {
      key: 'by',
      title: t('by'),
      width: 122,
      render: (_, i) => <span className={styles.muted}>{i.owner_name}</span>,
    },
  ];
}

export function InvoiceCard({ i }: { i: Invoice }) {
  const fmt = useFmt();
  const { styles } = useInvoiceCellStyles();
  return (
    <>
      <div className={styles.mRow}>
        <b className={styles.code}>{i.code}</b>
        <StatusChip i={i} />
      </div>
      <div className={styles.mRow}>
        <span className={styles.cust}>{i.contact_name}</span>
        <b className={styles.value}>{fmt.money(i.amount)}</b>
      </div>
      <div className={styles.mRow}>
        <span className={styles.muted}>{i.title}</span>
        <span className={styles.muted}>{fmt.date(i.issued_at)}</span>
      </div>
    </>
  );
}
