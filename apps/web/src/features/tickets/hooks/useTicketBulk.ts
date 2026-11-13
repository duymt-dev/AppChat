// Sửa ticket hàng loạt (TIP-034c §4.1): CHỐT tập id lúc gửi (không theo bộ lọc / trang), gửi kèm version đang thấy (`if_versions`) của các
// dòng đang hiển thị, theo dõi kết quả TỪNG id từ biên nhận (`/data-jobs/:id/result` — 202 chạy nền vẫn đọc tiếp qua điều hướng / tải lại
// trang nhờ sessionStorage theo workspace). Kết thúc → giữ chọn các ticket chưa áp dụng được; 202 không bao giờ coi là xong. Hoàn tác qua
// action chuẩn `ticket.bulk_undo` (xem trước + xác nhận), huỷ / thử lại qua data_job.*; đổi workspace không áp kết quả muộn sang nơi khác.
'use client';
import { useCallback, useEffect } from 'react';
import { App } from 'antd';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { transport } from '@/shared/api/client';
import { useAction } from '@/shared/actions/useAction';
import { toastUndo } from '@/shared/actions/useUndoAction';
import { useMe } from '@/shared/shell/useShellData';
import type { Paged } from '@/shared/list/paged';
import { useTicketsUi } from '../tickets-store';
import {
  failedOutcomes,
  isTerminal,
  type BulkOp,
  type BulkPatch,
  type TicketBulkResult,
  type TicketBulkUndoResult,
} from '../bulk-types';
import type { Ticket } from '../types';

const POLL_MS = 2000;
const KEY = (ws: string) => `tk.bulk:${ws}`;
const bulkKey = (jobId: string | null) => ['tickets', 'bulk', jobId] as const;
type Job = { job_id: string; action_log_id: string };

const load = (ws: string): BulkOp | null => {
  try {
    const v = sessionStorage.getItem(KEY(ws));
    return v ? (JSON.parse(v) as BulkOp) : null;
  } catch {
    return null;
  }
};
const save = (ws: string, op: BulkOp | null) => {
  try {
    if (op) sessionStorage.setItem(KEY(ws), JSON.stringify(op));
    else sessionStorage.removeItem(KEY(ws));
  } catch {
    // không có storage (riêng tư / chặn) — vẫn theo dõi trong phiên
  }
};

/** Dòng ticket của các danh sách ĐANG hiển thị (version để gửi `if_versions`, mã để hiện kết quả). */
const activeRows = (qc: QueryClient) =>
  qc
    .getQueriesData<Paged<Ticket>>({ queryKey: ['tickets', 'list'], type: 'active' })
    .flatMap(([, d]) => d?.data ?? []);
const resultOpts = <R extends { operation: { status: string } }>(jobId: string | null) => ({
  queryKey: bulkKey(jobId),
  queryFn: () => transport.get<R>(`/data-jobs/${jobId}/result`),
  enabled: !!jobId,
  refetchInterval: (q: { state: { data?: R } }) => (isTerminal(q.state.data) ? false : POLL_MS),
});

export function useTicketBulk() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const t = useTranslations();
  const ws = useMe().data?.current_workspace_id ?? '';
  const ui = useTicketsUi();
  const op = ui.bulkOp && ui.bulkOp.ws === ws ? ui.bulkOp : null;
  const bulk = useAction<TicketBulkResult>('ticket.bulk_update');
  const undoAct = useAction<TicketBulkUndoResult>('ticket.bulk_undo');
  const cancelAct = useAction('data_job.cancel');
  const retryAct = useAction('data_job.retry');
  const fwd = useQuery(resultOpts<TicketBulkResult>(op?.jobId ?? null));
  const back = useQuery(resultOpts<TicketBulkUndoResult>(op?.undoJobId ?? null));
  const setOp = useCallback(
    (next: BulkOp | null) => {
      useTicketsUi.getState().set({ bulkOp: next });
      if (ws) save(ws, next);
    },
    [ws],
  );
  const refreshList = useCallback(
    () => qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'tickets' && q.queryKey[1] !== 'bulk' }),
    [qc],
  );

  // Tải lại trang: nối lại thao tác của ĐÚNG workspace này.
  useEffect(() => {
    if (ws && !useTicketsUi.getState().bulkOp) {
      const saved = load(ws);
      if (saved) useTicketsUi.getState().set({ bulkOp: saved });
    }
  }, [ws]);

  // Kết thúc (một lần): giữ chọn ticket chưa áp dụng được, làm mới danh sách.
  const fwdDone = isTerminal(fwd.data);
  useEffect(() => {
    if (!op || op.settled || !fwdDone || !fwd.data) return;
    ui.set({ selected: failedOutcomes(fwd.data.outcomes).map((o) => o.id) });
    setOp({ ...op, settled: true });
    void refreshList();
  }, [op, fwdDone, fwd.data, ui, setOp, refreshList]);
  const backDone = isTerminal(back.data);
  useEffect(() => {
    if (backDone) void refreshList();
  }, [backDone, refreshList]);

  const apply = async (patch: BulkPatch) => {
    const ids = [...ui.selected];
    const v = Object.fromEntries(
      activeRows(qc)
        .filter((r) => r.version && ids.includes(r.id))
        .map((r) => [r.id, r.version!]),
    );
    const acc: { a?: Job } = {};
    const r = await bulk.run(
      { ticket_ids: ids, ...patch, ...(Object.keys(v).length ? { if_versions: v } : {}) },
      { onAccepted: (a) => void (a.status === 'job_accepted' && (acc.a = a)) },
    );
    const jobId = r?.result.operation.job_id ?? acc.a?.job_id;
    if (!jobId || !ws) return;
    if (r) qc.setQueryData(bulkKey(jobId), r.result);
    setOp({
      ws,
      jobId,
      logId: r?.action_log_id ?? acc.a?.action_log_id ?? null,
      ids,
      agent: !!patch.assignee_agent_id,
      undoJobId: null,
      settled: false,
    });
  };

  const undo = async () => {
    if (!op?.logId) return;
    const acc: { a?: Job } = {};
    const r = await undoAct.run(
      { parent_action_log_id: op.logId },
      { silent: true, onAccepted: (a) => void (a.status === 'job_accepted' && (acc.a = a)) },
    );
    const jobId = r?.result.operation.job_id ?? acc.a?.job_id;
    if (!jobId) return;
    if (r) qc.setQueryData(bulkKey(jobId), r.result);
    setOp({ ...op, undoJobId: jobId });
    toastUndo(message, t as never, t('actions.ticket.bulk_update.title'), r?.result ?? null, !r);
  };

  const cancel = async () => {
    if (!op) return;
    await cancelAct.run({ job_id: op.jobId }, { silent: true });
    await qc.invalidateQueries({ queryKey: bulkKey(op.jobId) });
  };
  const retry = async () => {
    if (!op) return;
    let ok = false;
    const r = await retryAct.run({ job_id: op.jobId }, { silent: true, onAccepted: () => void (ok = true) });
    if (!r && !ok) return;
    setOp({ ...op, settled: false });
    await qc.invalidateQueries({ queryKey: bulkKey(op.jobId) });
  };

  const codeOf = (id: string) => activeRows(qc).find((r) => r.id === id)?.code ?? id;
  return {
    op,
    result: fwd.data,
    undoResult: back.data,
    busy: !!op && !fwdDone,
    apply,
    undo,
    cancel,
    retry,
    dismiss: () => setOp(null),
    codeOf,
    pending: bulk.isPending || undoAct.isPending,
  };
}
