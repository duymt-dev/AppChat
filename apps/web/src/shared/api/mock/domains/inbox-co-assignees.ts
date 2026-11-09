// Đồng phụ trách hội thoại (conversation_assignee) — khác người/agent phụ trách CHÍNH (`assignee`): luôn thêm/gỡ bằng tay qua
// conversation.add_assignee / remove_assignee (mirror handler thật `conversation-assignee.handlers.ts`). Tách khỏi `inbox.ts` (trần 400).
import { ApiRequestError } from '@appchat/shared';
import members from '../../../../../../../fixtures/prototype-parity/customers.json';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';

type Ci = { conversation_id: string };
type AssigneeInput = Ci & { kind: 'user' | 'agent'; assignee_id: string };

const rowsOf = (db: MockDb, conversationId: string) => (db.inbox.coAssignees[conversationId] ??= []);
const sameAssignee = (r: { kind: 'user' | 'agent'; id: string }, kind: 'user' | 'agent', id: string) => r.kind === kind && r.id === id;

/** Tên đồng phụ trách (người qua fixture khách hàng, agent qua `db.agents`) — mirror `read.service.ts` `coAssigneeNames`. */
export function withCoAssignees<T extends { id: string }>(db: MockDb, c: T): T & { co_assignees?: { kind: 'user' | 'agent'; id: string; name: string }[] } {
  const rows = db.inbox.coAssignees[c.id];
  if (!rows?.length) return c;
  const co_assignees = rows
    .map((r) => {
      const name = r.kind === 'user' ? members.members.find((m) => m.id === r.id)?.name : db.agents.agents.find((a) => a.id === r.id)?.name;
      return name ? { kind: r.kind, id: r.id, name } : null;
    })
    .filter((x): x is { kind: 'user' | 'agent'; id: string; name: string } => !!x);
  return co_assignees.length ? { ...c, co_assignees } : c;
}

export const coAssigneeHandlers: Record<string, MockHandler> = {
  'conversation.add_assignee': {
    execute: (db, i: AssigneeInput) => {
      const c = db.inbox.conversations.find((x) => x.id === i.conversation_id)!;
      if (c.assignee === i.assignee_id) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'assignee_id', fields: { assignee_id: 'is_primary' } });
      const rows = rowsOf(db, i.conversation_id);
      if (!rows.some((r) => sameAssignee(r, i.kind, i.assignee_id))) rows.push({ kind: i.kind, id: i.assignee_id });
      return { assignees: rows.length };
    },
    undo: (db, i: AssigneeInput) => {
      db.inbox.coAssignees[i.conversation_id] = rowsOf(db, i.conversation_id).filter((r) => !sameAssignee(r, i.kind, i.assignee_id));
    },
  },
  'conversation.remove_assignee': {
    execute: (db, i: AssigneeInput) => {
      const rows = rowsOf(db, i.conversation_id);
      if (!rows.some((r) => sameAssignee(r, i.kind, i.assignee_id))) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'assignee_id' });
      db.inbox.coAssignees[i.conversation_id] = rows.filter((r) => !sameAssignee(r, i.kind, i.assignee_id));
      return { assignees: db.inbox.coAssignees[i.conversation_id]!.length };
    },
    undo: (db, i: AssigneeInput) => {
      const rows = rowsOf(db, i.conversation_id);
      if (!rows.some((r) => sameAssignee(r, i.kind, i.assignee_id))) rows.push({ kind: i.kind, id: i.assignee_id });
    },
  },
};
