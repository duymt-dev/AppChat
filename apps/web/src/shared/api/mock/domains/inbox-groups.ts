// Mock quản lý nhóm (TIP-025b §A) cùng hợp đồng server: trạng thái nhóm (chính sách + phiên bản CAS, số quan sát, ảnh chụp nhà cung cấp),
// lệnh nhóm `queued` → đọc trạng thái lệnh (mock xác nhận ngay; thêm thành viên id bắt đầu `blocked` → lỗi từng người), ứng viên = hội
// thoại 1-1. Phiên bản lệch → 409 như server. Không có URL link.
import { ApiRequestError, type GroupCommandDto, type GroupStateDto } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

type Snap = NonNullable<GroupStateDto['provider']>;
type State = { policy: GroupStateDto['policy']; version: number; provider: Snap | null };

const states = new Map<string, State>();
const commands = new Map<string, GroupCommandDto>();
let seq = 0;

const fail = (status: number, code: 'CONFLICT' | 'NOT_FOUND' | 'VALIDATION_FAILED' | 'INVALID_TRANSITION', message: string): never => {
  throw new ApiRequestError(status, { code, message });
};
const groupConv = (db: MockDb, id: string) => {
  const c = db.inbox.conversations.find((x) => x.id === id);
  if (!c) return fail(404, 'NOT_FOUND', 'conversation_id');
  if (c.kind !== 'group') return fail(409, 'INVALID_TRANSITION', 'not_group');
  return c;
};
const stateOf = (id: string): State => states.get(id) ?? states.set(id, { policy: 'mention', version: 0, provider: null }).get(id)!;

function queue(id: string, kind: GroupCommandDto['kind'], members?: GroupCommandDto['members'], link?: GroupCommandDto['link']): { command_id: string; status: 'queued' } {
  const command_id = `0190f000-0000-7000-8000-${String(0xc000 + ++seq).padStart(12, '0')}`;
  const failed = members?.some((m) => m.status === 'failed');
  const state = members ? (failed ? (members.some((m) => m.status === 'confirmed') ? 'partial' : 'failed') : 'confirmed') : 'confirmed';
  const at = new Date().toISOString();
  commands.set(command_id, { id: command_id, kind, conversation_id: id, state, error: null, ...(members ? { members } : {}), ...(link ? { link } : {}), created_at: at, finished_at: at });
  return { command_id, status: 'queued' };
}

const snapshot = (db: MockDb, id: string): Snap => {
  const c = groupConv(db, id);
  return stateOf(id).provider ?? { name: c.title, total: 12, complete: false, account_role: 'admin', link_enabled: false, muted: false, version: '1', fetched_at: new Date().toISOString() };
};

const stateRoute =
  (id: string): MockRoute =>
  (db) => {
    const c = groupConv(db, id);
    const s = stateOf(id);
    return {
      conversation_id: c.id,
      policy: s.policy,
      policy_version: s.version,
      observed_members: 4,
      provider: s.provider,
      supports: { refresh: true, add_members: true, update: s.provider?.account_role !== 'member', set_mute: true, link: s.provider?.account_role !== 'member' },
      can_manage: true,
      pending: [],
    } satisfies GroupStateDto;
  };

const candidatesRoute =
  (): MockRoute =>
  (db) => ({ data: db.inbox.conversations.filter((c) => c.kind === 'direct').slice(0, 20).map((c) => ({ conversation_id: c.id, title: c.title, contact_id: null })), next_cursor: null });

/** /conversations/:id/group · /conversations/:id/group/candidates · /inbox/group-commands/:id. */
export const inboxGroupParamRoute = (path: string): MockRoute | null => {
  const s = path.match(/^\/conversations\/([^/]+)\/group(\/candidates)?$/);
  if (s) return s[2] ? candidatesRoute() : stateRoute(s[1]!);
  const c = path.match(/^\/inbox\/group-commands\/([^/]+)$/);
  return c ? () => commands.get(c[1]!) ?? fail(404, 'NOT_FOUND', 'command_id') : null;
};

type Ci = { conversation_id: string };

export const inboxGroupHandlers: Record<string, MockHandler> = {
  'group.set_ai_policy': {
    execute: (db, i: Ci & { policy: State['policy']; if_version: number }) => {
      groupConv(db, i.conversation_id);
      const s = stateOf(i.conversation_id);
      if (s.version !== i.if_version) fail(409, 'CONFLICT', `stale:${s.version}`);
      s.policy = i.policy;
      s.version += 1;
      return { policy: s.policy, policy_version: s.version };
    },
  },
  'group.refresh': {
    execute: (db, i: Ci) => {
      stateOf(i.conversation_id).provider = { ...snapshot(db, i.conversation_id), fetched_at: new Date().toISOString() };
      return queue(i.conversation_id, 'refresh');
    },
  },
  'group.update': {
    execute: (db, i: Ci & { name?: string; invite_link_enabled?: boolean; expected_version: string }) => {
      const p = snapshot(db, i.conversation_id);
      if (p.version !== i.expected_version) fail(409, 'CONFLICT', `stale:${p.version}`);
      stateOf(i.conversation_id).provider = { ...p, ...(i.name ? { name: i.name } : {}), ...(i.invite_link_enabled !== undefined ? { link_enabled: i.invite_link_enabled } : {}), version: String(Number(p.version) + 1) };
      return queue(i.conversation_id, 'update');
    },
  },
  'group.set_mute': {
    execute: (db, i: Ci & { muted: boolean }) => {
      stateOf(i.conversation_id).provider = { ...snapshot(db, i.conversation_id), muted: i.muted };
      return queue(i.conversation_id, 'set_mute');
    },
  },
  // §A.6: chỉ đọc link — tắt thì enabled false, không URL; không bao giờ bật link.
  'group.copy_link': {
    execute: (db, i: Ci) => {
      const p = snapshot(db, i.conversation_id);
      return queue(i.conversation_id, 'link', undefined, { enabled: !!p.link_enabled, url: p.link_enabled ? `https://zalo.me/g/${i.conversation_id}` : null });
    },
  },
  'group.add_members': {
    execute: (db, i: Ci & { member_conversation_ids: string[] }) => {
      groupConv(db, i.conversation_id);
      const members = [...new Set(i.member_conversation_ids)].map((id) => (id.startsWith('blocked') ? { id, status: 'failed' as const, error: 'blocked' } : { id, status: 'confirmed' as const, error: null }));
      if (!members.length) fail(422, 'VALIDATION_FAILED', 'member_conversation_ids');
      return queue(i.conversation_id, 'add_members', members);
    },
  },
};

/** Test: về trạng thái đầu. */
export const resetGroupMock = () => {
  states.clear();
  commands.clear();
};
