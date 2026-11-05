// Mock thao tác kênh trên tin (TIP-014b A) — như server: hội thoại Zalo → thu hồi / cảm xúc là lệnh bền, 202 `job_accepted` +
// `/inbox/channel-operations/:id`; tin chỉ đổi khi "nhà cung cấp" xác nhận (lần đọc trạng thái đầu = pending, lần sau = confirmed). Kênh khác
// (web chat) → áp ngay như cũ. Tin có `provider_op` trong luồng khi lệnh chưa xác nhận (UI không coi là đã thu hồi).
import { ApiRequestError } from '@appchat/shared';

/** Store mock (cấu trúc — không import store: tránh vòng phụ thuộc như data-jobs). */
type MockDb = { inbox: { conversations: { id: string; channel: string }[]; messages: Record<string, { id: string; kind: string; [k: string]: unknown }[]> } };

type Op = { id: string; kind: 'recall' | 'react'; conversation_id: string; message_id: string; emoji?: string | null; polls: number; state: 'pending' | 'confirmed'; created_at: string; finished_at: string | null };
type Msg = { id: string; kind: string; reaction?: string | null; recalled?: boolean; provider_op?: { recall?: string; react?: string }; [k: string]: unknown };

const ops = new Map<string, Op>();
let seq = 0;

const notFound = () => new ApiRequestError(404, { code: 'NOT_FOUND', message: 'operation_id', fields: { operation_id: 'not_found' } });
const msgOf = (db: MockDb, convId: string, id: string) => db.inbox.messages[convId]?.find((x) => x.id === id) as unknown as Msg | undefined;

/** Hội thoại đi qua nhà cung cấp có ACK (Zalo cá nhân) — như manifest `operations.recall / react = remote`. */
export const isRemote = (db: MockDb, convId: string) => db.inbox.conversations.find((c) => c.id === convId)?.channel === 'zalo_personal';

function accept(op: Omit<Op, 'id' | 'polls' | 'state' | 'created_at' | 'finished_at'>) {
  const id = `0190f00e-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
  ops.set(id, { ...op, id, polls: 0, state: 'pending', created_at: new Date().toISOString(), finished_at: null });
  return { job_id: id, status_url: `/v1/inbox/channel-operations/${id}` };
}

/** message.recall trên Zalo: đánh dấu đang chờ, chưa ẩn nội dung. */
export function requestRecall(db: MockDb, convId: string, messageId: string) {
  const m = msgOf(db, convId, messageId);
  if (!m) throw notFound();
  if (m.recalled) return { recalled: true };
  m.provider_op = { ...m.provider_op, recall: 'pending' };
  return { recalled: false, __accepted: accept({ kind: 'recall', conversation_id: convId, message_id: messageId }) };
}

/** message.react trên Zalo: ý định của tài khoản (bấm lại cùng emoji = gỡ) — menu hiện ngay, trạng thái chờ ACK. */
export function requestReact(db: MockDb, convId: string, messageId: string, emoji: string) {
  const m = msgOf(db, convId, messageId);
  if (!m) throw notFound();
  const next = m.reaction === emoji ? null : emoji;
  m.reaction = next;
  m.provider_op = { ...m.provider_op, react: 'pending' };
  return { emoji: next, __accepted: accept({ kind: 'react', conversation_id: convId, message_id: messageId, emoji: next }) };
}

function settle(db: MockDb, op: Op) {
  if (op.state !== 'pending' || ++op.polls < 2) return;
  op.state = 'confirmed';
  op.finished_at = new Date().toISOString();
  const m = msgOf(db, op.conversation_id, op.message_id);
  if (!m) return;
  if (op.kind === 'recall') m.recalled = true;
  const { [op.kind]: _done, ...rest } = m.provider_op ?? {};
  void _done;
  m.provider_op = Object.keys(rest).length ? rest : undefined;
}

export const channelOperationsRoute = (path: string): ((db: MockDb) => unknown) | undefined => {
  const m = path.match(/^\/inbox\/channel-operations\/([0-9a-f-]{36})$/);
  if (!m) return undefined;
  return (db) => {
    const op = ops.get(m[1]!);
    if (!op) throw notFound();
    settle(db, op);
    return {
      id: op.id,
      kind: op.kind,
      conversation_id: op.conversation_id,
      message_id: op.message_id,
      state: op.state,
      ...(op.kind === 'react' ? { emoji: op.emoji ?? null } : {}),
      error: null,
      created_at: op.created_at,
      finished_at: op.finished_at,
    };
  };
};

/** Đổi workspace / reset mock — không giữ trạng thái lệnh của phiên cũ. */
export const resetChannelOperations = () => {
  ops.clear();
  seq = 0;
};
