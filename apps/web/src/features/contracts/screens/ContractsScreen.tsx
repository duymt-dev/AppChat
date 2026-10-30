// Hợp đồng (orchestrator) — prototype L5343–5486: PageHeader + KPI · chip trạng thái + lọc · chọn nhiều · (DataTable | Kanban 4 cột) · drawer / form / duyệt & ký / gửi ký / AI.
// `?from_quote=` (nút "→ Hợp đồng" ở báo giá đã chốt) → contract.create_from_quote rồi mở drawer hợp đồng nháp vừa tạo.
'use client';
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DataTable, Icon, KanbanBoard, PageHeader, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useContractsStyles } from '../styles/contracts.styles';
import { useContractsUi } from '../contracts-store';
import { contractsMetaQuery, contractsQuery } from '../api';
import { ContractCard, ContractKanbanCard, useContractColumns, useTr } from '../columns';
import { BulkBar, ContractsToolbar } from '../components/ContractsToolbar';
import { ContractAiDrawer } from '../components/ContractAiDrawer';
import { ApproveSignModal, SendSignModal } from '../components/SignModals';
import { KANBAN, chipOf } from '../status';
import type { Contract } from '../types';
import { useContractsUiCommands } from '../ui-commands';
import { ListPager } from '@/shared/list/ListPager';

const KPI = [
  ['total', color.blue, 'ic-doc'],
  ['signed', color.okGreen, 'ic-check'],
  ['pending', color.amberDeep, 'ic-clock'],
  ['value', color.violet, 'ic-chart'],
] as const;

function useFromQuote() {
  const params = useSearchParams();
  const router = useRouter();
  const fromQuote = useAction<{ contract_id: string }>('contract.create_from_quote');
  const set = useContractsUi((s) => s.set);
  const done = useRef('');
  const quoteId = params.get('from_quote');
  useEffect(() => {
    if (!quoteId || done.current === quoteId) return;
    done.current = quoteId;
    void fromQuote.run({ quote_id: quoteId }).then((r) => {
      if (r) set({ detail: r.result.contract_id, tab: 'overview' });
      router.replace('/contracts');
    });
  }, [quoteId]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function ContractsScreen() {
  useContractsUiCommands();
  useFromQuote();
  const t = useTranslations('contracts');
  const { styles } = useContractsStyles();
  const ui = useContractsUi();
  const list = useQuery(contractsQuery(ui.filter, ui.pg));
  const meta = useQuery(contractsMetaQuery()).data;
  const canCreate = useCan('contract.draft');
  const columns = useContractColumns();
  const tr = useTr();
  const rows = list.data?.data ?? [];
  const open = (c: Contract) => ui.set({ detail: c.id, tab: 'overview' });
  const kpiVal = {
    total: String(meta?.stats.total ?? 0),
    signed: String(meta?.stats.signed ?? 0),
    pending: String(meta?.stats.pending ?? 0),
    value: meta ? tr(meta.stats.active_value) : '',
  };

  return (
    <div className={styles.wrap} data-testid="contracts">
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
                data-testid="ct-search"
              />
            </div>
            {canCreate ? (
              <button
                type="button"
                className={styles.primary}
                onClick={() => ui.set({ form: 'create', prefill: null })}
                data-testid="ct-create"
              >
                <Icon name="ic-plus" size={15} color={color.white} strokeWidth={2} />
                {t('create')}
              </button>
            ) : null}
            <button
              type="button"
              className={styles.aiBtn}
              onClick={() => ui.set({ aiOpen: true })}
              data-testid="ct-ai-open"
            >
              <Icon name="ic-spark" size={15} color={color.white} />
              {t('ai')}
            </button>
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
      <ContractsToolbar meta={meta} />
      <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
        {ui.layout === 'list' ? (
          <>
            <BulkBar rows={rows} />
            <DataTable<Contract>
              testId="ct-table"
            footer={<ListPager meta={list.data?.meta} unit={t('unit')} onChange={ui.setPg} testId="ct-table-pager" />}
              rows={rows}
              columns={columns}
              rowKey={(r) => r.id}
              minWidth={1400}
              selection={{ keys: ui.selected, onChange: (k) => ui.set({ selected: k.map(String) }) }}
              onRowClick={open}
              rowProps={(r) => ({ 'data-contract': r.id })}
              mobileCard={(r) => <ContractCard c={r} />}
              emptyText={t('empty')}
            />
          </>
        ) : (
          <KanbanBoard<Contract>
            testId="ct-kanban"
            columns={KANBAN.map(([k, c]) => ({ key: k, label: t(`chip.${k}`), color: c }))}
            items={rows}
            itemKey={(r) => r.id}
            groupBy={(r) => chipOf(r.status)}
            renderCard={(r) => <ContractKanbanCard c={r} onOpen={() => open(r)} />}
          />
        )}
      </PageStates>
      {meta ? <ContractAiDrawer meta={meta} /> : null}
      <ApproveSignModal />
      <SendSignModal />
    </div>
  );
}
