// Ticket (orchestrator) — prototype L4837–4955: topbar + 5 KPI · lọc 6 trường + sắp xếp / xuất / chế độ xem · chọn nhiều ·
// (DataTable | Kanban 4 cột) · drawer chi tiết (SLA, trao đổi, lịch sử) · form tạo · hộp đóng ticket · AI panel.
'use client';
import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DataTable, KanbanBoard, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useTicketsStyles } from '../styles/tickets.styles';
import { useTicketsUi } from '../tickets-store';
import { ticketsMetaQuery, ticketsQuery } from '../api';
import { TicketCard, TicketKanbanCard, useTicketColumns } from '../columns';
import { TicketsHeader } from '../components/TicketsHeader';
import { BulkBar } from '../components/BulkBar';
import { TicketDrawer } from '../components/TicketDrawer';
import { CloseTicketModal } from '../components/CloseTicketModal';
import { TicketsAiDrawer } from '../components/TicketsAiDrawer';
import { STATUSES, STATUS_TONE } from '../status';
import type { Channel, Ticket, TicketsMeta, TicketStatus } from '../types';
import { useTicketsUiCommands } from '../ui-commands';
import { ListPager } from '@/shared/list/ListPager';

const NO_NOW = '1970-01-01T00:00:00Z';

/** Tạo ticket từ tin nhắn trong Hộp thư (REQ-C09 "Tạo ticket từ tin này", điền sẵn rồi mở ngay chi tiết). */
function useFromMessage(meta: TicketsMeta | undefined) {
  const params = useSearchParams();
  const router = useRouter();
  const create = useAction<{ ticket_id: string }>('ticket.create');
  const set = useTicketsUi((s) => s.set);
  const done = useRef('');
  const title = params.get('tk_title');
  useEffect(() => {
    if (!title || !meta || done.current === title) return;
    done.current = title;
    void create
      .run({
        title,
        channel: (params.get('tk_channel') as Channel | null) ?? 'zalo_personal',
        category: meta.categories[0]!,
        priority: 'medium',
        status: 'open',
        team_id: meta.teams[0]!.id,
        assignee_user_id: meta.members[0]?.id,
      })
      .then((r) => {
        if (r) set({ detail: r.result.ticket_id, tab: 'detail' });
        router.replace('/tickets');
      });
  }, [title, meta]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function TicketsScreen() {
  useTicketsUiCommands();
  const t = useTranslations('tickets');
  const { styles } = useTicketsStyles();
  const ui = useTicketsUi();
  const list = useQuery(ticketsQuery(ui.filter, ui.pg));
  const meta = useQuery(ticketsMetaQuery()).data;
  useFromMessage(meta);
  const columns = useTicketColumns(meta?.now ?? NO_NOW);
  const setStatus = useAction('ticket.set_status');
  const rows = list.data?.data ?? [];
  const open = (k: Ticket) => ui.set({ detail: k.id, tab: 'detail' });
  // Kéo sang "Đã đóng" → hộp đóng (lý do bắt buộc); cột khác → ticket.set_status.
  const move = (k: Ticket, to: string) => {
    if (to === k.status) return;
    if (to === 'closed') return ui.set({ closeFor: k.id });
    if (k.status === 'closed') return;
    void setStatus.run({ ticket_id: k.id, status: to as Exclude<TicketStatus, 'closed'> });
  };

  return (
    <div className={styles.wrap} data-testid="tickets">
      <TicketsHeader meta={meta} count={rows.length} />
      {meta ? <BulkBar meta={meta} /> : null}
      <PageStates state={stateOf(list)} onRetry={() => void list.refetch()}>
        {ui.layout === 'list' ? (
          <DataTable<Ticket>
            testId="tk-table"
            footer={<ListPager meta={list.data?.meta} unit={t('unit')} onChange={ui.setPg} testId="tk-table-pager" />}
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            minWidth={1080}
            selection={{ keys: ui.selected, onChange: (k) => ui.set({ selected: k.map(String) }) }}
            onRowClick={open}
            rowProps={(r) => ({ 'data-ticket': r.id })}
            mobileCard={(r) => <TicketCard k={r} />}
            emptyText={t('empty')}
          />
        ) : (
          <KanbanBoard<Ticket>
            testId="tk-kanban"
            columns={STATUSES.map((s) => ({ key: s, label: t(`status.${s}`), color: STATUS_TONE[s] ?? color.text3 }))}
            items={rows}
            itemKey={(r) => r.id}
            groupBy={(r) => r.status}
            renderCard={(r) => <TicketKanbanCard k={r} onOpen={() => open(r)} />}
            onMove={move}
          />
        )}
      </PageStates>
      {meta ? <TicketDrawer meta={meta} /> : null}
      {meta ? <TicketsAiDrawer meta={meta} /> : null}
      <CloseTicketModal />
    </div>
  );
}
