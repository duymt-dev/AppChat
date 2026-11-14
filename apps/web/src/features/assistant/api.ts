// Đọc Trợ lý AI (Blueprint §4.4, §4.5). Ghi qua useAction; lượt chat qua transport.post — JSON một lần (DV-006, chưa SSE).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { UiCommand } from '@appchat/actions';
import type { ActionLogRow, AiTasksPayload, ApprovalRow, AssistantHome, ChatMessage, ConfirmEvent, Run, TurnEvent } from './types';

export const homeQuery = () =>
  queryOptions({ queryKey: ['assistant', 'home'], queryFn: () => transport.get<AssistantHome>('/assistant/home'), staleTime: Infinity });

export const tasksQuery = () => queryOptions({ queryKey: ['ai-tasks'], queryFn: () => transport.get<AiTasksPayload>('/ai-tasks') });

export interface LogFilter {
  kind: string;
  status: string;
  day: string;
  q: string;
}

export const actionLogsQuery = (f: LogFilter) =>
  queryOptions({
    queryKey: ['action-logs', f],
    queryFn: () =>
      transport.get<{ data: ActionLogRow[]; total: number }>('/action-logs', Object.fromEntries(Object.entries(f).filter(([, v]) => v && v !== 'all'))),
  });

export const approvalsQuery = (status: string) =>
  queryOptions({ queryKey: ['approvals', status], queryFn: () => transport.get<{ data: ApprovalRow[] }>('/approvals', { status }) });

/** Runs của khung "Trợ lý AI đang điều phối" — REQ-E14: run con của lượt Cowork cuối; chưa có lượt → run đang sống. */
export const runsQuery = (rootRunId: string | null) =>
  queryOptions({
    queryKey: ['runs', rootRunId ?? 'live'],
    queryFn: () => transport.get<{ data: Run[] }>('/runs', rootRunId ? { root_run_id: rootRunId } : { status: 'live' }),
  });

export const confirmTurn = (token: string, decision: 'confirm' | 'cancel') =>
  transport.post<{ status: string; action_log_id?: string; approval_id?: string; ui_target?: UiCommand; events?: TurnEvent[] }>('/assistant/confirm', { confirm_token: token, decision });

/** Sửa thẻ xem trước (REQ-E03b): chỉ xem trước lại → thẻ mới (token mới); token cũ mất hiệu lực. */
export const editPreview = (token: string, input: Record<string, unknown>) => transport.post<{ card: ConfirmEvent }>('/assistant/preview-edit', { confirm_token: token, input });

/** Tin của một phiên (cũ → mới) — "Mở trong Trợ lý" từ drawer nạp lại cùng phiên, không gọi model (TIP-023c G2). */
type StoredMessage = Omit<ChatMessage, 'target' | 'files'> & { run_id: string | null; attachment?: { artifact_id: string; name: string; kind: string | null } };

export const sessionMessages = (id: string) => transport.get<{ data: StoredMessage[] }>(`/assistant/sessions/${encodeURIComponent(id)}/messages`);

/** Tin đã lưu → bong bóng: phần tệp (TIP-023f — chỉ tên / loại) gộp vào tin người dùng ngay trước nó, không thành bong bóng rỗng. */
export function threadOf(rows: readonly StoredMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of rows) {
    const last = out.at(-1);
    if (m.attachment && m.role === 'user' && last?.role === 'user' && !m.text) {
      last.files = [...(last.files ?? []), { name: m.attachment.name, kind: m.attachment.kind ?? 'file' }];
      continue;
    }
    out.push({ id: m.id, role: m.role, text: m.text, card: m.card, status: m.status, ui: m.ui, ...(m.attachment ? { files: [{ name: m.attachment.name, kind: m.attachment.kind ?? 'file' }] } : {}) });
  }
  return out;
}
