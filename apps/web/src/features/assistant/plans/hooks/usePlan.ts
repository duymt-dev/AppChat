// Thẻ kế hoạch của phiên (TIP-023d §6.1): đọc chiếu tiến độ thật + nút người dùng. "Sửa kế hoạch" gọi action chuẩn rồi chờ server xả
// xong (pause_requested → paused); "Lưu" chỉ đổi bước chưa chạy; "Tiếp tục" tách riêng; Dừng là run.cancel sẵn có. Revision mới không bị
// bản cũ ghi đè (§6.2) — mọi thao tác gửi `if_revision` hiện hành, server 409 khi lệch thì đọc lại.
'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAction } from '@/shared/actions/useAction';
import { sessionPlanQuery } from '../api';
import { HELD_PHASES, type Plan } from '../types';

export type PlanOp =
  | { op: 'update'; step_id: string; patch: { title?: string; instructions?: string } }
  | { op: 'remove'; step_id: string }
  | { op: 'move'; step_id: string; after_step_id: string | null };

/** Đang chờ xả (đã yêu cầu sửa) → đọc lại thưa cho tới khi `paused`. */
const POLL_MS = 1500;

export function usePlan(sessionId: string | undefined) {
  const qc = useQueryClient();
  const q = useQuery({ ...sessionPlanQuery(sessionId), refetchInterval: (s) => (s.state.data?.phase === 'pause_requested' || s.state.data?.phase === 'resuming' ? POLL_MS : false) });
  const edit = useAction('assistant.plan_request_edit');
  const update = useAction('assistant.plan_update');
  const resume = useAction('assistant.plan_resume');
  const cancel = useAction('run.cancel');
  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ['assistant', 'plan', sessionId ?? ''] }), [qc, sessionId]);
  const ctl = (p: Plan) => ({ plan_id: p.id, if_revision: p.revision });

  return {
    plan: q.data ?? null,
    loading: q.isLoading,
    held: !!q.data && HELD_PHASES.has(q.data.phase),
    busy: edit.isPending || update.isPending || resume.isPending || cancel.isPending,
    requestEdit: async (p: Plan) => (await edit.run(ctl(p)), refresh()),
    save: async (p: Plan, ops: PlanOp[]) => (ops.length ? (await update.run({ ...ctl(p), ops }), refresh()) : undefined),
    resume: async (p: Plan) => (await resume.run(ctl(p)), refresh()),
    stop: async (p: Plan) => (p.root_run_id ? (await cancel.run({ run_id: p.root_run_id }), refresh()) : undefined),
  };
}
