// Báo giá (orchestrator) — prototype L4957–5187: PageHeader + KPI · chip trạng thái + lọc · chọn nhiều · (DataTable | KanbanBoard) · drawer / form / AI.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AiButton, DataTable, Icon, KanbanBoard, PageHeader, color } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useQuotesStyles } from '../styles/quotes.styles';
import { useQuotesUi } from '../quotes-store';
import { quotesMetaQuery, quotesQuery } from '../api';
import { QuoteCard, QuoteKanbanCard, useQuoteColumns } from '../columns';
import { BulkBar, QuotesToolbar } from '../components/QuotesToolbar';
import { QuoteDrawer } from '../components/QuoteDrawer';
import { QuoteAiDrawer } from '../components/QuoteAiDrawer';
import { DraftFromContentModal } from '../components/DraftFromContentModal';
import { KANBAN } from '../status';
import type { Quote } from '../types';
import { useQuotesUiCommands } from '../ui-commands';
import { ListPager } from '@/shared/list/ListPager';

const KPI = [
  ['total', color.blue, 'ic-doc'],
  ['approved', color.okGreen, 'ic-check'],
  ['waiting', color.amberDeep, 'ic-clock'],
  ['close', color.violet, 'ic-chart'],
] as const;

export function QuotesScreen() {
  useQuotesUiCommands();
  const t = useTranslations('quotes');
  const tc = useTranslations('common');
  const { styles } = useQuotesStyles();
  const ui = useQuotesUi();
  const list = useQuery(quotesQuery(ui.filter, ui.pg));
  const meta = useQuery(quotesMetaQuery()).data;
  const canCreate = useCan('quote.create');
  const columns = useQuoteColumns();
  const rows = list.data?.data ?? [];
  const open = (q: Quote) => ui.set({ detail: q.id, tab: 'overview' });
  const kpiVal = {
    total: String(meta?.stats.total ?? 0),
    approved: String(meta?.stats.approved ?? 0),
    waiting: String(meta?.stats.waiting ?? 0),
    close: meta?.stats.close_rate ?? '',
  };

  return (
    <div className={styles.wrap} data-testid="quotes">
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
                data-testid="q-search"
              />
            </div>
            {canCreate ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => ui.set({ form: 'create', prefill: null })}
                data-testid="q-create"
              >
                <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2} />
                {t('create')}
              </button>
            ) : null}
            <AiButton label={tc('aiButton')} module={t('title')} onClick={() => ui.set({ aiOpen: true })} testId="q-ai-open" />
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
      <QuotesToolbar meta={meta} />
      <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
        {ui.layout === 'list' ? (
          <>
            <BulkBar rows={rows} />
            <DataTable<Quote>
              testId="q-table"
            footer={<ListPager meta={list.data?.meta} unit={t('unit')} onChange={ui.setPg} testId="q-table-pager" />}
              rows={rows}
              columns={columns}
              rowKey={(r) => r.id}
              minWidth={1180}
              selection={{ keys: ui.selected, onChange: (k) => ui.set({ selected: k.map(String) }) }}
              onRowClick={open}
              rowProps={(r) => ({ 'data-quote': r.id })}
              mobileCard={(r) => <QuoteCard q={r} />}
              emptyText={t('empty')}
            />
          </>
        ) : (
          <KanbanBoard<Quote>
            testId="q-kanban"
            columns={KANBAN.map(([k, c]) => ({ key: k, label: t(`kanban.${k}` as never), color: c }))}
            items={rows}
            itemKey={(r) => r.id}
            groupBy={(r) => r.status}
            renderCard={(r) => <QuoteKanbanCard q={r} onOpen={() => open(r)} />}
          />
        )}
      </PageStates>
      {meta ? <QuoteDrawer meta={meta} /> : null}
      {meta ? <QuoteAiDrawer meta={meta} /> : null}
      <DraftFromContentModal />
    </div>
  );
}
