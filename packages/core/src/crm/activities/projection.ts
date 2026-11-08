// Chiếu bản ghi hoạt động → DTO theo quyền người xem (TIP-026b §1.4): tiền cơ hội ẩn ở mức service (VẮNG + `amount_hidden`, không phải 0 /
// null giả); tên người theo membership (người đã rời → "không còn khả dụng"). Không đọc / trả thân ghi chú vào timeline.
import type { AuthzContext, NoteItemDto, OpportunityItemDto, TaskItemDto } from '@appchat/shared';
import { canReadAmount } from './authority';

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

interface OppRow {
  id: string;
  title: string;
  need: string;
  amountVnd: bigint | null;
  stage: OpportunityItemDto['stage'];
  probability: { toString(): string } | null;
  expectedCloseDate: Date | null;
  quoteId: string | null;
  archivedAt: Date | null;
  updatedAt: Date;
  version: number;
}
export function opportunityDto(o: OppRow, authz: AuthzContext): OpportunityItemDto {
  const money = canReadAmount(authz) ? { amount_vnd: o.amountVnd === null ? null : String(o.amountVnd) } : { amount_hidden: true };
  return {
    id: o.id,
    title: o.title,
    need: o.need,
    ...money,
    stage: o.stage,
    probability: o.probability === null ? null : Number(o.probability.toString()),
    expected_close_date: o.expectedCloseDate ? o.expectedCloseDate.toISOString().slice(0, 10) : null,
    quote_id: o.quoteId,
    archived: !!o.archivedAt,
    updated_at: o.updatedAt.toISOString(),
    version: o.version,
  };
}
