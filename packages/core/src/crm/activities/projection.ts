// Chiếu bản ghi hoạt động → DTO theo quyền người xem (TIP-026b §1.4): tên người theo membership (người đã rời → "không còn khả dụng").
// Không đọc / trả thân ghi chú vào timeline. Cơ hội chiếu ở crm/opportunities/read.service (TIP-026c — tiền ẩn VẮNG + `amount_hidden`).
import type { NoteItemDto, TaskItemDto } from '@appchat/shared';

type Names = Map<string, string>;

interface NoteRow {
  id: string;
  kind: 'note' | 'comment';
  body: string;
  authorUserId: string | null;
  actorType: string;
  createdAt: Date;
  version: number;
}
export function noteDto(n: NoteRow, names: Names, agentLabel: string): NoteItemDto {
  const isUser = !!n.authorUserId;
  return {
    id: n.id,
    kind: n.kind,
    body: n.body,
    author: { type: isUser ? 'user' : n.actorType === 'agent' ? 'agent' : 'system', name: isUser ? (names.get(n.authorUserId!) ?? '') : agentLabel },
    created_at: n.createdAt.toISOString(),
    version: n.version,
  };
}

interface TaskRow {
  id: string;
  title: string;
  description: string;
  dueAt: Date | null;
  assigneeUserId: string | null;
  state: 'open' | 'done' | 'cancelled';
  completedAt: Date | null;
  version: number;
}
/** `active` = id thành viên còn hoạt động (người bị gỡ hiện không khả dụng, không mở được việc chỉ nhờ được giao). */
export function taskDto(t: TaskRow, names: Names, active: Set<string>): TaskItemDto {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    due_at: t.dueAt?.toISOString() ?? null,
    assignee: t.assigneeUserId ? { id: t.assigneeUserId, name: names.get(t.assigneeUserId) ?? '', available: active.has(t.assigneeUserId) } : null,
    state: t.state,
    completed_at: t.completedAt?.toISOString() ?? null,
    version: t.version,
  };
}
