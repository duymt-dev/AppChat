// Đơn hàng (orchestrator) — prototype L5489–5618: PageHeader + KPI · chip + lọc · chọn nhiều · (DataTable | Kanban 4 cột) · drawer / form / huỷ / AI.
// `?from_quote=` / `?from_contract=` ("→ Đơn hàng" ở báo giá đã chốt / hợp đồng đã ký) → order.create_from_* rồi mở drawer đơn vừa tạo.
'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AiButton, DataTable, Icon, KanbanBoard, PageHeader, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useOrdersStyles } from '../styles/orders.styles';
import { useOrdersUi } from '../orders-store';
import { ordersMetaQuery, ordersQuery } from '../api';
import { OrderCard, OrderKanbanCard, useOrderColumns, useTr } from '../columns';
import { BulkBar, OrdersToolbar } from '../components/OrdersToolbar';
import { CancelOrderModal, OrderDrawer } from '../components/OrderDrawer';
import { OrderAiDrawer } from '../components/OrderAiDrawer';
import { KANBAN, laneOf } from '../status';
import type { Order } from '../types';
import { useOrdersUiCommands } from '../ui-commands';
import { ListPager } from '@/shared/list/ListPager';

const KPI = [
  ['total', color.blue, 'ic-doc'],
  ['paid', color.okGreen, 'ic-check'],
  ['pending', color.amberDeep, 'ic-clock'],
  ['revenue', color.violet, 'ic-chart'],
] as const;

function useFromSource() {
  const params = useSearchParams();
  const router = useRouter();
  const fromQuote = useAction<{ order_id: string }>('order.create_from_quote');
  const fromContract = useAction<{ order_id: string }>('order.create_from_contract');
  const set = useOrdersUi((s) => s.set);
  const done = useRef('');
  const quoteId = params.get('from_quote');
  const contractId = params.get('from_contract');
  useEffect(() => {
    const key = quoteId ?? contractId;
    if (!key || done.current === key) return;
    done.current = key;
    const run = quoteId
      ? fromQuote.run({ quote_id: quoteId })
      : fromContract.run({ contract_id: contractId! });
    void run.then((r) => {
      if (r) set({ detail: r.result.order_id, tab: 'overview' });
      router.replace('/orders');
    });
  }, [quoteId, contractId]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function OrdersScreen() {
  useOrdersUiCommands();
  useFromSource();
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const { styles } = useOrdersStyles();
  const ui = useOrdersUi();
  const list = useQuery(ordersQuery(ui.filter, ui.pg));
  const meta = useQuery(ordersMetaQuery()).data;
  const canCreate = useCan('order.manage');
  const columns = useOrderColumns();
  const tr = useTr();
  const rows = list.data?.data ?? [];
  const open = (o: Order) => ui.set({ detail: o.id, tab: 'overview' });
  const kpiVal = {
    total: String(meta?.stats.total ?? 0),
    paid: String(meta?.stats.paid ?? 0),
    pending: String(meta?.stats.pending ?? 0),
    revenue: meta ? tr(meta.stats.revenue) : '',
  };

  return (
    <div className={styles.wrap} data-testid="orders">
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        actions={
          <>
            <div className={styles.search}>
              <Icon name="ic-search" size={14} color={color.text4} />
              <input
                value={ui.filter.q}
                onChange={(e) => ui.setFilter({ q: e.target.value })}
                placeholder={t('search')}
                aria-label={t('search')}
                data-testid="od-search"
              />
            </div>
            {canCreate ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => ui.set({ form: 'create', prefill: null })}
                data-testid="od-create"
              >
                <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2} />
                {t('create')}
              </button>
            ) : null}
            <AiButton label={tc('aiButton')} module={t('title')} onClick={() => ui.set({ aiOpen: true })} testId="od-ai-open" />
          </>
        }
        kpis={KPI.map(([k, c, icon]) => ({
          key: k,
          label: t(`stats.${k}`),
          value: kpiVal[k],
          color: c,
          icon,
        }))}
      />
      <OrdersToolbar meta={meta} />
      <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
        {ui.layout === 'list' ? (
          <>
            <BulkBar rows={rows} />
            <DataTable<Order>
              testId="od-table"
            footer={<ListPager meta={list.data?.meta} unit={t('unit')} onChange={ui.setPg} testId="od-table-pager" />}
              rows={rows}
              columns={columns}
              rowKey={(r) => r.id}
              minWidth={1180}
              selection={{ keys: ui.selected, onChange: (k) => ui.set({ selected: k.map(String) }) }}
              onRowClick={open}
              rowProps={(r) => ({ 'data-order': r.id })}
              mobileCard={(r) => <OrderCard o={r} />}
              emptyText={t('empty')}
            />
          </>
        ) : (
          <KanbanBoard<Order>
            testId="od-kanban"
            columns={KANBAN.map(([k, c]) => ({ key: k, label: t(`chip.${k}`), color: c }))}
            items={rows}
            itemKey={(r) => r.id}
            groupBy={(r) => laneOf(r.status, r.pay_status)}
            renderCard={(r) => <OrderKanbanCard o={r} onOpen={() => open(r)} />}
          />
        )}
      </PageStates>
      {meta ? <OrderDrawer meta={meta} /> : null}
      {meta ? <OrderAiDrawer meta={meta} /> : null}
      <CancelOrderModal />
    </div>
  );
}
