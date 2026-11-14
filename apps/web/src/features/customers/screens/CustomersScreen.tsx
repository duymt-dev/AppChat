// Khách hàng (orchestrator) — prototype L2451–2984: PageHeader + KPI · StageTabs · thanh lọc · (DataTable | KanbanBoard) · drawer / modal.
'use client';
import { useState, type Key } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DataTable, KanbanBoard, PageHeader, StageTabs } from '@appchat/ui';
import { useCan } from '@/shared/authz/useCan';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useCrmStyles } from '../styles/crm.styles';
import { useCrmUi } from '../crm-store';
import { contactsQuery, crmStatsQuery, duplicatesQuery } from '../api';
import { ContactCard, useContactColumns } from '../columns';
import { CrmHeaderActions } from '../components/CrmHeaderActions';
import { CrmToolbar } from '../components/CrmToolbar';
import { CrmOverlays } from '../components/CrmOverlays';
import { useAssistantContext } from '../hooks/useAssistantContext';
import { useAssignContactAi } from '../hooks/useAssignContactAi';
import { useHighlight } from '../hooks/useHighlight';
import { KanbanCard } from '../components/KanbanCard';
import { BoardMore } from '../components/CustomerBoard';
import { useCustomerBoard } from '../hooks/useCustomerBoard';
import type { ContactRow, StageKey } from '../types';
import { useCustomersUiCommands } from '../ui-commands';
import { ListPager } from '@/shared/list/ListPager';

export function CustomersScreen() {
  useCustomersUiCommands();
  const t = useTranslations('customers');
  const { styles } = useCrmStyles();
  const ui = useCrmUi();
  const kanban = ui.layout === 'kanban';
  const list = useQuery({ ...contactsQuery(ui.filter, ui.pg), enabled: !kanban });
  const kb = useCustomerBoard(ui.filter, kanban);
  const board = kb.board;
  const stats = useQuery(crmStatsQuery()).data;
  const dups = useQuery(duplicatesQuery()).data;
  const canEdit = useCan('crm.edit');
  const [selected, setSelected] = useState<Key[]>([]);
  useAssistantContext(selected);
  const rows = list.data?.data ?? [];
  const highlight = useHighlight(kanban ? [] : rows, kanban ? board.isSuccess : list.isSuccess);
  const columns = useContactColumns(useAssignContactAi());
  const cols = kb.columns;
  const boardRows = kb.rows;

  return (
    <div className={styles.wrap} data-testid="customers">
      <PageHeader
        title={t('title')}
        subtitle={t('sub')}
        actions={<CrmHeaderActions dupCount={dups?.count ?? 0} />}
        kpis={stats?.stats.map((k) => ({ ...k, label: t(`stats.${k.key}` as never) }))}
      />
      <StageTabs
        stages={(stats?.stages ?? []).map((s) => ({ key: s.key, label: t(`stages.${s.key}`), color: s.color, count: s.count }))}
        value={ui.filter.stage}
        onChange={(k) => ui.setFilter({ stage: k as StageKey })}
        views={[
          { key: 'list', label: t('layout.list'), icon: 'ic-inbox' },
          { key: 'kanban', label: t('layout.kanban'), icon: 'ic-grid' },
        ]}
        view={ui.layout}
        onView={(k) => ui.set({ layout: k as 'list' | 'kanban' })}
      />
      <CrmToolbar allSelected={rows.length > 0 && selected.length === rows.length} selected={selected.length} onSelectAll={(on) => setSelected(on ? rows.map((r) => r.id) : [])} />
      <PageStates state={stateOf(kanban ? board : list)} onRetry={() => void (kanban ? board : list).refetch()}>
        {!kanban ? (
          <DataTable<ContactRow>
            testId="crm-table"
            footer={<ListPager meta={list.data?.meta} unit={t('unit')} onChange={ui.setPg} testId="crm-table-pager" />}
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            minWidth={1150}
            selection={{ keys: selected, onChange: setSelected }}
            onRowClick={(r) => ui.set({ detail: r.id })}
            rowProps={(r) => ({ 'data-contact': r.id })}
            highlightKey={highlight}
            mobileCard={(r) => <ContactCard c={r} />}
            emptyText={t('empty')}
          />
        ) : (
          <KanbanBoard<ContactRow>
            testId="crm-kanban"
            columns={cols.map((s) => ({ key: s.key, label: t(`stages.${s.key}`), color: s.color, total: s.total }))}
            items={boardRows}
            itemKey={(r) => r.id}
            groupBy={(r) => r.stage}
            renderCard={(r) => <KanbanCard c={r} tagDefs={stats?.tag_defs ?? []} />}
            onMove={canEdit && !kb.moving ? (r, to) => void kb.move(r, to) : undefined}
            renderColumnFooter={(k) => <BoardMore col={cols.find((c) => c.key === k)} onMore={() => void kb.loadMore(k)} />}
            addLabel={canEdit ? t('kanban.add') : undefined}
            onAdd={() => ui.open('create')}
          />
        )}
      </PageStates>
      <CrmOverlays rows={kanban ? boardRows : rows} selected={rows.filter((r) => selected.includes(r.id))} onBulkDone={() => setSelected([])} />
    </div>
  );
}
