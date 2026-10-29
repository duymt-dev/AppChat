// Mock Hộp thư (Blueprint §4.4 inbox): GET /conversations, /conversations/:id, /conversations/:id/messages, /conversations/counts,
// /inbox/accounts, /inbox/connect-channels, /contacts/:id (360). Dữ liệu = prototype L1505–2226, kênh map về zalo_personal / webchat / email.
import fixture from '../../../../../../../fixtures/prototype-parity/inbox.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';

export type InboxFixture = typeof fixture;
type Conv = InboxFixture['conversations'][number];
type Msg = { id: string; kind: string; [k: string]: unknown };

export interface InboxState {
  conversations: (Conv & { status: string; archived: boolean; ai_mode: string; assignee: string | null; pinned: boolean })[];
  messages: Record<string, Msg[]>;
  seq: number;
}

export const createInboxState = (): InboxState => ({
  conversations: fixture.conversations.map((c) => ({ ...structuredClone(c), status: 'open', archived: false, ai_mode: 'copilot', assignee: null, pinned: !!c.pinned_note })),
  messages: structuredClone(fixture.messages) as Record<string, Msg[]>,
  seq: 0,
});

/** ?inbox=empty (parity / e2e `inbox:empty`): workspace chưa có hội thoại nào. */
const isEmptySeed = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('inbox') === 'empty';

export const inboxRoutes: Record<string, MockRoute> = {
  '/conversations': (db, p) => {
    if (isEmptySeed()) return { data: [], next_cursor: null };
    const channel = p.channel as string | undefined;
    const rows = db.inbox.conversations.filter((c) => !c.archived && c.status !== 'closed' && (!channel || c.channel === channel));
    return { data: rows, next_cursor: null };
  },
  '/conversations/counts': () => (isEmptySeed() ? { ...fixture.folders, empty: true } : fixture.folders),
  '/inbox/accounts': () => fixture.accounts,
  '/inbox/connect-channels': () => fixture.connect_channels,
  '/inbox/channels': () => fixture.channels,
  '/canned-replies': () => fixture.canned_replies,
  '/booking/slots': () => fixture.slots,
};

/** Route có tham số: /conversations/:id, /conversations/:id/messages, /contacts/:id, /groups/:id. */
export const inboxParamRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/(conversations|contacts|groups)\/([^/]+)(\/messages)?$/);
  if (!m) return null;
  const [, kind, id, sub] = m as unknown as [string, string, string, string | undefined];
  if (kind === 'contacts') return () => (fixture.contacts as Record<string, unknown>)[id] ?? null;
  if (kind === 'groups') return () => (fixture.groups as Record<string, unknown>)[id] ?? null;
  if (sub) return (db) => ({ data: db.inbox.messages[id] ?? [], next_cursor: null, suggestion: (fixture.suggestions as Record<string, unknown>)[id] ?? null });
  return (db) => db.inbox.conversations.find((c) => c.id === id) ?? null;
};

const conv = (db: Parameters<MockRoute>[0], id: string) => db.inbox.conversations.find((c) => c.id === id)!;

type Ci = { conversation_id: string };

export const inboxHandlers: Record<string, MockHandler> = {
  'conversation.mark_read': {
    execute: (db, i: Ci) => {
      conv(db, i.conversation_id).unread = 0;
      return { unread_count: 0 };
    },
  },
  'conversation.set_status': {
    execute: (db, i: Ci & { status: string }) => {
      conv(db, i.conversation_id).status = i.status;
      return { status: i.status };
    },
    undo: (db, i: Ci) => {
      conv(db, i.conversation_id).status = 'open';
    },
  },
  'conversation.assign': {
    execute: (db, i: Ci & { user_id: string }) => {
      conv(db, i.conversation_id).assignee = i.user_id;
      return { assignee_user_id: i.user_id };
    },
    undo: (db, i: Ci) => {
      conv(db, i.conversation_id).assignee = null;
    },
  },
  'conversation.tag': {
    execute: (db, i: Ci & { tag: string }) => {
      const c = conv(db, i.conversation_id);
      if (!c.tags.some((t) => t.label === i.tag)) c.tags.push({ label: i.tag, tone: 'channel' });
      return { tags: c.tags.map((t) => t.label) };
    },
    undo: (db, i: Ci & { tag: string }) => {
      const c = conv(db, i.conversation_id);
      c.tags = c.tags.filter((t) => t.label !== i.tag);
    },
  },
  'conversation.pin': {
    execute: (db, i: Ci & { pinned: boolean }) => {
      conv(db, i.conversation_id).pinned = i.pinned;
      return { pinned: i.pinned };
    },
  },
  'conversation.archive': {
    execute: (db, i: Ci) => {
      conv(db, i.conversation_id).archived = true;
      return { archived: true };
    },
    undo: (db, i: Ci) => {
      conv(db, i.conversation_id).archived = false;
    },
  },
  'conversation.set_ai_mode': {
    execute: (db, i: Ci & { ai_mode: string }) => {
      conv(db, i.conversation_id).ai_mode = i.ai_mode;
      return { ai_mode: i.ai_mode };
    },
    undo: (db, i: Ci) => {
      conv(db, i.conversation_id).ai_mode = 'copilot';
    },
  },
  'conversation.handoff': {
    execute: (db, i: Ci) => {
      const c = conv(db, i.conversation_id);
      c.ai_state = 'idle';
      c.assignee = 'u_tram';
      return { ai_state: 'idle' };
    },
  },
  'conversation.clear_history': {
    execute: (db, i: Ci) => {
      const n = db.inbox.messages[i.conversation_id]?.length ?? 0;
      db.inbox.messages[`__cleared_${i.conversation_id}`] = db.inbox.messages[i.conversation_id] ?? [];
      db.inbox.messages[i.conversation_id] = [];
      return { cleared: n };
    },
    undo: (db, i: Ci) => {
      db.inbox.messages[i.conversation_id] = db.inbox.messages[`__cleared_${i.conversation_id}`] ?? [];
    },
  },
  'message.send': {
    execute: (db, i: Ci & { text: string }) => {
      const id = `ms${++db.inbox.seq}`;
      const list = (db.inbox.messages[i.conversation_id] ??= []);
      const at = list.findIndex((m) => m.kind === 'typing');
      const msg: Msg = { id, kind: 'text', direction: 'out', body: i.text, time: 'Vừa xong', status: 'sent', plain: true };
      if (at >= 0) list.splice(at, 0, msg);
      else list.push(msg);
      const c = conv(db, i.conversation_id);
      c.preview = i.text;
      c.ai_draft = undefined as never;
      return { message_id: id };
    },
  },
  'note.add': {
    execute: (db, i: Ci & { text: string }) => {
      const id = `mn${++db.inbox.seq}`;
      (db.inbox.messages[i.conversation_id] ??= []).push({ id, kind: 'note', body: i.text, time: 'Vừa xong', plain: true });
      return { message_id: id };
    },
    undo: (db, i: Ci) => {
      const list = db.inbox.messages[i.conversation_id] ?? [];
      const at = list.map((m) => m.kind).lastIndexOf('note');
      if (at >= 0) list.splice(at, 1);
    },
  },
  'message.recall': {
    execute: (db, i: Ci & { message_id: string }) => {
      const m = db.inbox.messages[i.conversation_id]?.find((x) => x.id === i.message_id);
      if (m) Object.assign(m, { recalled: true });
      return { recalled: true };
    },
  },
  'message.delete': {
    execute: (db, i: Ci & { message_id: string }) => {
      const m = db.inbox.messages[i.conversation_id]?.find((x) => x.id === i.message_id);
      if (m) Object.assign(m, { deleted: true });
      return { deleted: true };
    },
    undo: (db, i: Ci & { message_id: string }) => {
      const m = db.inbox.messages[i.conversation_id]?.find((x) => x.id === i.message_id);
      if (m) Object.assign(m, { deleted: false });
    },
  },
};
