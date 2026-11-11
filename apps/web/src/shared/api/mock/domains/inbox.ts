// Mock Hộp thư (Blueprint §4.4 inbox): GET /conversations, /conversations/:id, /conversations/:id/messages, /conversations/counts,
// /inbox/accounts, /inbox/connect-channels, /contacts/:id (360). Dữ liệu = prototype L1505–2226, kênh map về zalo_personal / webchat / email.
import { foldText, type AgentIntent } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/inbox.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import { isRemote, requestReact, requestRecall } from './channel-operations';
import { SEED_INTENT, handoffSummaryRoute, hasHandoffSummary } from './inbox-handoff';
import { withActivities360 } from './customers';
import { coAssigneeHandlers, withCoAssignees } from './inbox-co-assignees';
import { checkDraftRef, suggestionWithRef, withDraftCitations, withDraftRef } from './inbox-draft-ref';

export type InboxFixture = typeof fixture;
type Conv = InboxFixture['conversations'][number];
type Msg = { id: string; kind: string; [k: string]: unknown };

export interface InboxState {
  conversations: (Conv & {
    status: string;
    archived: boolean;
    ai_mode: string;
    assignee: string | null;
    pinned: boolean;
    hidden: boolean;
    pinned_message_id: string | null;
    intent?: AgentIntent;
    has_handoff_summary: boolean;
  })[];
  messages: Record<string, Msg[]>;
  /** Hội thoại có ghi chú @nhắc người dùng hiện tại chưa đọc (TIP-025 thư mục "Nhắc đến tôi"). */
  mentioned: string[];
  /** Bản ghi nhãn trước khi `conversation.set_tags` áp — dùng để hoàn tác. */
  tagBackup: Record<string, { label: string; tone: string }[]>;
  /** Đồng phụ trách (conversation_assignee) theo hội thoại — khác `assignee` phụ trách chính. */
  coAssignees: Record<string, { kind: 'user' | 'agent'; id: string }[]>;
  /** TIP-020c: hội thoại có nháp / gợi ý AI mà nguồn tri thức đã bị nạp lại / thu hồi. */
  revokedDrafts: string[];
  seq: number;
}

export const createInboxState = (): InboxState => ({
  conversations: fixture.conversations.map((c) => ({
    ...structuredClone(c),
    status: 'open',
    archived: false,
    ai_mode: 'copilot',
    assignee: null,
    pinned: !!c.pinned_note,
    hidden: false,
    pinned_message_id: null,
    intent: SEED_INTENT[c.id],
    has_handoff_summary: hasHandoffSummary(c.id),
  })),
  messages: structuredClone(fixture.messages) as Record<string, Msg[]>,
  mentioned: [],
  tagBackup: {},
  coAssignees: {},
  revokedDrafts: [],
  seq: 0,
});

type Row = InboxState['conversations'][number];
const PAGE = 50;
const live = (c: Row) => !c.archived && !c.hidden && c.status !== 'closed';
/** Thư mục → điều kiện (khớp `conversations.repo.ts`); thư mục chưa có dữ liệu (gắn sao / spam / bộ lọc đã lưu) = tất cả. */
const FOLDER: Record<string, (c: Row, s: InboxState) => boolean> = {
  all: live,
  mine: (c) => live(c) && c.assignee === 'u_tram',
  unread: (c) => live(c) && c.unread > 0,
  mention: (c, s) => live(c) && s.mentioned.includes(c.id),
  team: (c) => live(c) && !!c.assignee && c.assignee !== 'u_tram',
  ai_running: (c) => live(c) && c.ai_state === 'running',
  ai_pending_approval: (c) => live(c) && c.ai_state === 'waiting_approval',
  needs_human: (c) => live(c) && c.ai_state === 'handoff',
  vip: (c) => live(c) && c.tags.some((t) => t.tone === 'vip'),
  complaint: (c) => live(c) && c.tags.some((t) => foldText(t.label).includes('khieu nai')),
  archived: (c) => c.archived,
  closed: (c) => c.status === 'closed' && !c.archived,
};

/** Bộ lọc ngoài thư mục (cùng tham số API): kênh (bỏ khi đếm theo kênh) · tài khoản · tìm kiếm không dấu. */
function filterOf(p: Record<string, unknown>, withChannel: boolean) {
  const channel = withChannel ? (p.channel as string | undefined) : undefined;
  const account = fixture.accounts.find((a) => a.id === p.channel_account_id);
  const q = foldText(String(p.q ?? '').trim());
  return (c: Row) =>
    (!channel || c.channel === channel) &&
    (!p.channel_account_id || (!!account && account.channel === c.channel && account.name.endsWith(c.account))) &&
    (!q || foldText(`${c.title} ${c.preview}`).includes(q));
}

function filteredCounts(s: InboxState, match: (c: Row) => boolean, byChannel: (c: Row) => boolean) {
  const n = (k: string) => s.conversations.filter((c) => FOLDER[k]!(c, s) && match(c)).length;
  const swap = <T extends unknown[]>(r: T, at: number) => r.map((v, i) => (i === at ? n(String(r[0])) : v)) as T;
  const ch = new Map<string, number>();
  for (const c of s.conversations) if (live(c) && byChannel(c)) ch.set(c.channel, (ch.get(c.channel) ?? 0) + 1);
  return {
    ...fixture.folders,
    tabs: fixture.folders.tabs.map((r) => (FOLDER[String(r[0])] ? swap(r, 1) : r)),
    mailbox: fixture.folders.mailbox.map((r) => (FOLDER[String(r[0])] ? swap(r, 2) : r)),
    ai: fixture.folders.ai.map((r) => (FOLDER[String(r[0])] ? swap(r, 2) : r)),
    channels: fixture.folders.channels.map(([k]) => [k, ch.get(String(k)) ?? 0]),
  };
}

/** ?inbox=empty (parity / e2e `inbox:empty`): workspace chưa có hội thoại nào. */
const isEmptySeed = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('inbox') === 'empty';
/** ?inbox=deleted_contact (TIP-015f §5.4): kịch bản khách của các hội thoại đã xoá mềm — dấu `contact_deleted`, không đổi fixture gốc. */
const deletedSeed = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('inbox') === 'deleted_contact';

export const inboxRoutes: Record<string, MockRoute> = {
  // Cùng tham số với API (TIP-025): folder · channel · channel_account_id · q (không dấu) · sort · cursor (vị trí, 50 / trang).
  '/conversations': (db, p) => {
    if (isEmptySeed()) return { data: [], next_cursor: null };
    const keep = FOLDER[String(p.folder ?? 'all')] ?? FOLDER.all!;
    const match = filterOf(p, true);
    let rows = db.inbox.conversations.filter((c) => keep(c, db.inbox) && match(c));
    if (p.sort === 'unread') rows = [...rows.filter((c) => c.unread > 0), ...rows.filter((c) => c.unread === 0)];
    const from = Number(p.cursor ?? 0) || 0;
    const page = rows.slice(from, from + PAGE);
    const marked = deletedSeed() ? page.map((c) => (c.contact_id ? { ...c, contact_deleted: true } : c)) : page;
    return { data: marked.map((c) => withDraftRef(db, withCoAssignees(db, c))), next_cursor: from + PAGE < rows.length ? String(from + PAGE) : null };
  },
  // Số liệu prototype; "Nhắc đến tôi" cộng các lần @nhắc mới trong phiên mock.
  '/conversations/counts': (db, p) => {
    if (isEmptySeed()) return { ...fixture.folders, empty: true };
    // Có bộ lọc kênh / tài khoản / tìm kiếm (TIP-025b §B.4) → đếm thật trên các hàng đang lọc; không lọc → số mẫu của prototype.
    if (p.channel || p.channel_account_id || p.q) return filteredCounts(db.inbox, filterOf(p, true), filterOf(p, false));
    const n = db.inbox.mentioned.length;
    if (!n) return fixture.folders;
    const bump = <T extends unknown[]>(r: T, at: number) => (r[0] === 'mention' ? (r.map((v, i) => (i === at ? Number(v) + n : v)) as T) : r);
    return { ...fixture.folders, tabs: fixture.folders.tabs.map((r) => bump(r, 1)), mailbox: fixture.folders.mailbox.map((r) => bump(r, 2)) };
  },
  '/inbox/accounts': () => fixture.accounts,
  '/inbox/connect-channels': () => fixture.connect_channels,
  // `reactions` theo manifest kênh (chỉ Zalo cá nhân nhận cảm xúc) — REQ-C09a.
  '/inbox/channels': () => Object.fromEntries(Object.entries(fixture.channels).map(([k, v]) => [k, { ...v, reactions: k === 'zalo_personal' }])),
  '/canned-replies': () => fixture.canned_replies,
  '/tags': (db) => db.settingsData.tags.map((t) => ({ id: t.id, name: t.name, color: t.color, emoji: t.emoji })),
};

const plainOf = (s: string) => s.replace(/<[^>]+>/g, '');

/** Tìm trong hội thoại (REQ-C12) — không dấu, lọc người gửi; `ranges` = vị trí khớp trên chữ đã bỏ thẻ. */
const searchRoute =
  (id: string): MockRoute =>
  (db, p) => {
    const needle = foldText(String(p.q ?? '').trim());
    const who = String(p.sender ?? 'all');
    if (!needle) return [];
    return (db.inbox.messages[id] ?? [])
      .filter((m) => m.direction && typeof m.body === 'string' && !m.deleted && !m.recalled)
      .map((m) => {
        const sender = m.direction === 'in' ? 'contact' : m.agent ? 'agent' : 'user';
        const body = plainOf(String(m.body));
        const folded = foldText(body);
        const ranges: [number, number][] = [];
        for (let i = folded.indexOf(needle); i >= 0; i = folded.indexOf(needle, i + needle.length)) ranges.push([i, i + needle.length]);
        return { message_id: m.id, body, sender, time: String(m.time ?? ''), ranges };
      })
      .filter((r) => r.ranges.length && (who === 'all' || r.sender === who));
  };

/** Route có tham số: /conversations/:id, /conversations/:id/messages(/search), /contacts/:id, /groups/:id. */
export const inboxParamRoute = (path: string): MockRoute | null => {
  const hs = handoffSummaryRoute(path);
  if (hs) return hs;
  const s = path.match(/^\/conversations\/([^/]+)\/messages\/search$/);
  if (s) return searchRoute(s[1]!);
  const m = path.match(/^\/(conversations|contacts|groups)\/([^/]+)(\/messages)?$/);
  if (!m) return null;
  const [, kind, id, sub] = m as unknown as [string, string, string, string | undefined];
  if (kind === 'contacts') return (db) => {
    const p = (fixture.contacts as Record<string, { id: string } & Record<string, unknown>>)[id];
    return p ? withActivities360(db, structuredClone(p)) : null;
  };
  if (kind === 'groups') return () => (fixture.groups as Record<string, unknown>)[id] ?? null;
  if (sub) return (db) => ({ data: db.inbox.messages[id] ?? [], next_cursor: null, suggestion: suggestionWithRef(db, id, (fixture.suggestions as Record<string, unknown>)[id]) });
  return (db) => {
    const c = db.inbox.conversations.find((x) => x.id === id);
    return c ? withDraftCitations(withDraftRef(db, withCoAssignees(db, c))) : null;
  };
};

const conv = (db: Parameters<MockRoute>[0], id: string) => db.inbox.conversations.find((c) => c.id === id)!;
const msg = (db: Parameters<MockRoute>[0], convId: string, messageId: string) => db.inbox.messages[convId]?.find((m) => m.id === messageId);

type Ci = { conversation_id: string };
type Mi = Ci & { message_id: string };

export const inboxHandlers: Record<string, MockHandler> = {
  'conversation.mark_read': {
    execute: (db, i: Ci) => {
      conv(db, i.conversation_id).unread = 0;
      db.inbox.mentioned = db.inbox.mentioned.filter((id) => id !== i.conversation_id);
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
    execute: (db, i: Ci & { user_id?: string; agent_id?: string }) => {
      conv(db, i.conversation_id).assignee = i.user_id ?? i.agent_id ?? null;
      return { assignee_user_id: i.user_id ?? null, assignee_agent_id: i.agent_id ?? null };
    },
    undo: (db, i: Ci) => {
      conv(db, i.conversation_id).assignee = null;
    },
  },
  ...coAssigneeHandlers,
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
  'conversation.set_tags': {
    execute: (db, i: Ci & { tags: string[] }) => {
      const c = conv(db, i.conversation_id);
      db.inbox.tagBackup[i.conversation_id] = c.tags;
      c.tags = i.tags.map((label) => c.tags.find((t) => t.label === label) ?? { label, tone: 'channel' as const });
      return { tags: i.tags };
    },
    undo: (db, i: Ci) => {
      const prev = db.inbox.tagBackup[i.conversation_id];
      if (prev) conv(db, i.conversation_id).tags = prev;
    },
  },
  'conversation.hide': {
    execute: (db, i: Ci & { hidden: boolean }) => {
      conv(db, i.conversation_id).hidden = i.hidden;
      return { hidden: i.hidden };
    },
    undo: (db, i: Ci) => {
      conv(db, i.conversation_id).hidden = false;
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
    execute: (db, i: Ci & { text?: string; reply_to_id?: string; attachments?: string[]; ai_draft_ref?: { id: string; generation: number } }) => {
      checkDraftRef(db, i.conversation_id, i.ai_draft_ref);
      const id = `ms${++db.inbox.seq}`;
      const list = (db.inbox.messages[i.conversation_id] ??= []);
      const at = list.findIndex((m) => m.kind === 'typing');
      const replyTo = i.reply_to_id ? list.find((m) => m.id === i.reply_to_id) : undefined;
      // Tệp mock (upload giả không giữ nội dung): hiện như tệp, tên = id.
      const files = (i.attachments ?? []).map((f) => ({ url: '#', mime: 'application/octet-stream', name: f }));
      const sent: Msg = { id, kind: files.length ? 'file' : 'text', direction: 'out', body: i.text ?? '', time: 'Vừa xong', status: 'sent', plain: true, sender: 'Trâm', ...(files.length ? { attachments: files } : {}) };
      if (replyTo) sent.reply_to = { id: replyTo.id, preview: String(replyTo.body ?? '').slice(0, 80) };
      if (at >= 0) list.splice(at, 0, sent);
      else list.push(sent);
      const c = conv(db, i.conversation_id);
      c.preview = i.text || (files[0]?.name ?? '');
      c.ai_draft = undefined as never;
      return { message_id: id };
    },
  },
  'note.add': {
    execute: (db, i: Ci & { text: string; mentions?: string[] }) => {
      const id = `mn${++db.inbox.seq}`;
      // Người dùng mock là Trâm (u_tram): nhắc chính mình không tính; nhắc người khác chỉ lưu (không có hộp thư của họ ở mock).
      if (i.mentions?.length && !db.inbox.mentioned.includes(i.conversation_id)) db.inbox.mentioned.push(i.conversation_id);
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
      // Zalo: lệnh bền chờ nhà cung cấp xác nhận (TIP-014b); kênh khác ẩn ngay trong AppChat.
      if (isRemote(db, i.conversation_id)) return requestRecall(db, i.conversation_id, i.message_id);
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
  'message.react': {
    execute: (db, i: Mi & { emoji: string }) => {
      if (isRemote(db, i.conversation_id)) return requestReact(db, i.conversation_id, i.message_id, i.emoji);
      const m = msg(db, i.conversation_id, i.message_id);
      if (!m) return { emoji: null };
      const next = m.reaction === i.emoji ? null : i.emoji;
      m.reaction = next;
      return { emoji: next };
    },
  },
  'message.pin': {
    execute: (db, i: Mi & { pinned: boolean }) => {
      conv(db, i.conversation_id).pinned_message_id = i.pinned ? i.message_id : null;
      return { pinned: i.pinned };
    },
    undo: (db, i: Mi) => {
      conv(db, i.conversation_id).pinned_message_id = null;
    },
  },
  'ai.translate': {
    // Như model giả của backend: tiền tố ngôn ngữ đích + nguyên văn (chữ đã bỏ thẻ).
    execute: (db, i: Mi & { to?: string }) => {
      const to = i.to ?? 'vi';
      const m = msg(db, i.conversation_id, i.message_id);
      return { text: `[${to.toUpperCase()}] ${plainOf(String(m?.body ?? ''))}`, to };
    },
  },
  'message.forward': {
    execute: (db, i: Mi & { target_conversation_id: string }) => {
      const src = msg(db, i.conversation_id, i.message_id);
      const id = `ms${++db.inbox.seq}`;
      const list = (db.inbox.messages[i.target_conversation_id] ??= []);
      list.push({ id, kind: src?.kind ?? 'text', direction: 'out', body: src?.body, title: src?.title, sub: src?.sub, price: src?.price, unit: src?.unit, time: 'Vừa xong', status: 'sent', plain: true, forwarded: true });
      return { message_id: id };
    },
  },
};
