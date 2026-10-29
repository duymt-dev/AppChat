// Đọc Trợ lý AI (Blueprint §4.4, §4.5). Ghi qua useAction; lượt chat qua transport.post (SSE ở backend thật).
import { queryOptions } from '@tanstack/react-query';
import { transport } from '@/shared/api/client';
import type { ActionLogRow, AiTasksPayload, ApprovalRow, AssistantHome, TurnEvent } from './types';

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

export const sendTurn = (text: string, mode: string, sessionId?: string) =>
  transport.post<{ session_id: string; events: TurnEvent[] }>('/assistant/messages', { text, mode, session_id: sessionId });

export const confirmTurn = (token: string, decision: 'confirm' | 'cancel') =>
  transport.post<{ status: string; ui_target?: { type: 'navigate'; route: string } }>('/assistant/confirm', { confirm_token: token, decision });
