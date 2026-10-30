// Đề nghị thanh toán (orchestrator) — prototype L5233–5341 ("Hóa đơn" → "Đề nghị thanh toán", COMMERCE §5): tiêu đề + tìm + tạo + AI ·
// 4 thẻ số liệu · bảng · drawer 360° (VietQR, ghi nhận thanh toán) · form tạo · hàng "Cần đối soát". `?order=` (từ đơn) → mở form điền sẵn.
'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AiButton, DataTable, Icon, PageHeader, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useShellStore } from '@/shared/shell/shell-store';
import { useInvoicesStyles } from '../styles/invoices.styles';
import { useInvoicesUi } from '../invoices-store';
import { invoicesMetaQuery, invoicesQuery } from '../api';
import { InvoiceCard, useInvoiceColumns, useTr } from '../columns';
import { InvoiceDrawer } from '../components/InvoiceDrawer';
import { InvoiceFormModal } from '../components/InvoiceFormModal';
import { RecordPaymentModal, VoidInvoiceModal } from '../components/PaymentModals';
import { ReconcileDrawer } from '../components/ReconcileDrawer';
import type { Invoice } from '../types';
import { useInvoicesUiCommands } from '../ui-commands';
import { ListPager } from '@/shared/list/ListPager';

const STATS = [
  ['total', color.text],
  ['collected', color.statusActive],
  ['pending', color.paidText],
  ['overdue', color.hotText],
] as const;

function useFromOrder() {
  const params = useSearchParams();
  const router = useRouter();
  const set = useInvoicesUi((s) => s.set);
  const done = useRef('');
  const orderId = params.get('order');
  useEffect(() => {
    if (!orderId || done.current === orderId) return;
    done.current = orderId;
    set({ form: 'create', prefill: { order_id: orderId } });
    router.replace('/invoices');
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function InvoicesScreen() {
  useInvoicesUiCommands();
  useFromOrder();
  const t = useTranslations('invoices');
  const tc = useTranslations('common');
  const { styles } = useInvoicesStyles();
  const ui = useInvoicesUi();
  const list = useQuery(invoicesQuery(ui.q, ui.pg));
  const meta = useQuery(invoicesMetaQuery()).data;
  const canCreate = useCan('invoice.manage');
  const setDock = useShellStore((s) => s.setDock);
  const columns = useInvoiceColumns();
  const tr = useTr();
  const rows = list.data?.data ?? [];
  const open = (i: Invoice) => ui.set({ detail: i.id, tab: 'overview' });
  const val = (k: (typeof STATS)[number][0]) =>
    !meta ? '' : k === 'total' ? String(meta.stats.total) : tr(meta.stats[k]);
  const pending = meta?.bank_txs.length ?? 0;
  const reconcile = pending ? (
    <button type="button" className={styles.reconcile} onClick={() => ui.set({ reconcileOpen: true })} data-testid="iv-reconcile-open">
      <Icon name="ic-bell" size={13} color={color.amberText} />
      {t('reconcile.btn', { n: pending })}
    </button>
  ) : null;

  return (
    <div className={styles.wrap} data-testid="invoices">
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        actions={
          <>
            <div className={styles.search}>
              <Icon name="ic-search" size={14} color={color.text4} />
              <input
                value={ui.q}
                onChange={(e) => ui.set({ q: e.target.value })}
                placeholder={t('search')}
                aria-label={t('search')}
                data-testid="iv-search"
              />
            </div>
            {canCreate ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => ui.set({ form: 'create', prefill: null })}
                data-testid="iv-create"
              >
                <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2.2} />
                {t('create')}
              </button>
            ) : null}
            <AiButton label={tc('aiButton')} module={t('title')} onClick={() => setDock(true)} testId="iv-ai-open" />
          </>
        }
      />
      <div className={styles.stats} data-testid="iv-stats">
        {STATS.map(([k, c]) => (
          <div key={k} className={styles.stat}>
            <div className={styles.statL}>{t(`stats.${k}`)}</div>
            <div className={styles.statV} style={{ color: c }} data-testid={`iv-stat-${k}`}>
              {val(k)}
            </div>
          </div>
        ))}
      </div>
      <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
        <div className={styles.table}>
          <DataTable<Invoice>
            testId="iv-table"
            footer={<ListPager meta={list.data?.meta} unit={t('unit')} onChange={(pg) => ui.set({ pg })} extra={reconcile} testId="iv-table-pager" />}
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            minWidth={980}
            onRowClick={open}
            rowProps={(r) => ({ 'data-invoice': r.id })}
            mobileCard={(r) => <InvoiceCard i={r} />}
            emptyText={t('empty')}
          />
        </div>
      </PageStates>
      {meta ? <InvoiceDrawer meta={meta} /> : null}
      {meta ? <ReconcileDrawer meta={meta} /> : null}
      <InvoiceFormModal />
      <RecordPaymentModal />
      <VoidInvoiceModal />
    </div>
  );
}
