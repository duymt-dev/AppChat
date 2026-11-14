// Mock bạn bè Zalo (TIP-014b E) — như server: lời mời tới mẫu trên tài khoản Zalo đang chạy; channel.friend.{accept,reject,send,undo} →
// 202 job_accepted, lần đọc /friends/:ext kế tiếp thấy kết quả (confirmed). Gửi: người lạ → 422, đã gửi → 409, trần 20 / ngày → 429. Tra
// SĐT (channel.lookup_user): số hỏng → 422, trần 30 / ngày → 429; số mẫu → found (lần đọc thứ hai), số khác → not_found. Không tạo khách.
import { ApiRequestError, normalizePhone } from '@appchat/shared';
import type { MockHandler } from '../handlers';

type MockDb = { settingsApps: { channels: { type: string; accounts: { id: string; connected: boolean; paused?: boolean }[] }[] } };
type Friend = { external_id: string; name: string; state: 'none' | 'incoming' | 'outgoing' | 'friend'; incoming_message: string | null; incoming_at: string | null; op: string | null; op_status: string | null; op_error: string | null; next?: Friend['state'] };
type Lookup = { id: string; account: string; phone: string; polls: number; created_at: string };

const AFTER = { accept: 'friend', reject: 'none', send: 'outgoing', undo: 'none' } as const;
const PHONES: Record<string, { external_id: string; name: string }> = { '0912345678': { external_id: '7400000009', name: 'Chị Thu (Zalo)' } };
/** Người đã nhắn với tài khoản mẫu — được gửi lời mời. */
const KNOWN = new Set(['7300000001', '7300000003']);
const friends = new Map<string, Map<string, Friend>>();
const lookups = new Map<string, Lookup>();
let sent = 0;
let used = 0;
let seq = 0;

const err = (status: number, field: string, code: string) => new ApiRequestError(status, { code: status === 409 ? 'CONFLICT' : status === 429 ? 'RATE_LIMITED' : 'VALIDATION_FAILED', message: code, fields: { [field]: code } });

function live(db: MockDb, accountId: string) {
  const ch = db.settingsApps.channels.find((c) => c.accounts.some((a) => a.id === accountId));
  const acc = ch?.accounts.find((a) => a.id === accountId);
  if (!ch || !acc) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'channel_account_id', fields: { channel_account_id: 'not_found' } });
  if (ch.type !== 'zalo_personal') throw err(422, 'channel_account_id', 'friends_unsupported');
  if (!acc.connected || acc.paused) throw err(409, 'channel_account_id', 'not_running');
}

function book(accountId: string) {
  let m = friends.get(accountId);
  if (!m) {
    const at = new Date(Date.now() - 3_600_000).toISOString();
    m = new Map([['7400000001', { external_id: '7400000001', name: 'Anh Long', state: 'incoming', incoming_message: 'Chào shop, kết bạn nhé', incoming_at: at, op: null, op_status: null, op_error: null }]]);
    friends.set(accountId, m);
  }
  return m;
}
const blank = (ext: string, name = ext): Friend => ({ external_id: ext, name, state: 'none', incoming_message: null, incoming_at: null, op: null, op_status: null, op_error: null });

function request(db: MockDb, op: keyof typeof AFTER, i: { channel_account_id: string; external_id: string }) {
  live(db, i.channel_account_id);
  const m = book(i.channel_account_id);
  const f = m.get(i.external_id) ?? blank(i.external_id);
  if (f.op_status === 'queued') throw err(409, 'external_id', 'operation_pending');
  if ((op === 'accept' || op === 'reject') && f.state !== 'incoming') throw err(409, 'external_id', 'no_incoming_request');
  if (op === 'undo' && f.state !== 'outgoing') throw err(409, 'external_id', 'no_outgoing_request');
  if (op === 'send') {
    if (f.state === 'friend' || f.state === 'outgoing') throw err(409, 'external_id', f.state === 'friend' ? 'already_friend' : 'already_requested');
    const found = [...lookups.values()].some((l) => l.account === i.channel_account_id && PHONES[l.phone]?.external_id === i.external_id);
    if (!KNOWN.has(i.external_id) && !found) throw err(422, 'external_id', 'unknown_identity');
    if (sent >= 20) throw err(429, 'channel_account_id', 'friend_daily_cap');
    sent++;
  }
  m.set(i.external_id, { ...f, op, op_status: 'queued', op_error: null, next: AFTER[op] });
  return { ok: true, __accepted: { job_id: `${i.channel_account_id}:${i.external_id}`, status_url: `/v1/settings/channels/${i.channel_account_id}/friends/${i.external_id}` } };
}

export const channelFriendsHandlers: Record<string, MockHandler> = {
  'channel.friend.accept': { execute: (db, i: { channel_account_id: string; external_id: string }) => request(db, 'accept', i) },
  'channel.friend.reject': { execute: (db, i: { channel_account_id: string; external_id: string }) => request(db, 'reject', i) },
  'channel.friend.send': { execute: (db, i: { channel_account_id: string; external_id: string }) => request(db, 'send', i) },
  'channel.friend.undo': { execute: (db, i: { channel_account_id: string; external_id: string }) => request(db, 'undo', i) },
  'channel.lookup_user': {
    execute: (db, i: { channel_account_id: string; phone: string }) => {
      live(db, i.channel_account_id);
      const phone = normalizePhone(i.phone);
      if (!phone || !/^0[35789][0-9]{8}$/.test(phone)) throw err(422, 'phone', 'invalid');
      if (used >= 30) throw err(429, 'channel_account_id', 'lookup_daily_cap');
      used++;
      const id = `0190f00e-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
      lookups.set(id, { id, account: i.channel_account_id, phone, polls: 0, created_at: new Date().toISOString() });
      return { ok: true, __accepted: { job_id: id, status_url: `/v1/settings/channels/${i.channel_account_id}/lookups/${id}` } };
    },
  },
};

const pub = ({ next: _n, ...f }: Friend) => f;

export const channelFriendsRoute = (path: string): ((db: MockDb) => unknown) | undefined => {
  const list = path.match(/^\/settings\/channels\/([^/]+)\/friends$/);
  if (list) return () => [...book(list[1]!).values()].filter((f) => f.state === 'incoming').map(pub);
  const one = path.match(/^\/settings\/channels\/([^/]+)\/friends\/([0-9]{1,20})$/);
  if (one)
    return () => {
      const m = book(one[1]!);
      const f = m.get(one[2]!) ?? blank(one[2]!);
      // Worker giả: lần đọc sau khi đặt lệnh thấy ACK.
      if (f.op_status === 'queued' && f.next) m.set(f.external_id, { ...f, state: f.next, op_status: 'confirmed', incoming_message: f.next === 'outgoing' ? f.incoming_message : null });
      return pub(f);
    };
  const look = path.match(/^\/settings\/channels\/([^/]+)\/lookups\/([0-9a-f-]{36})$/);
  if (!look) return undefined;
  return () => {
    const l = lookups.get(look[2]!);
    if (!l || l.account !== look[1]) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'lookup_id', fields: { lookup_id: 'not_found' } });
    const done = ++l.polls > 1;
    const hit = PHONES[l.phone];
    return {
      id: l.id,
      channel_account_id: l.account,
      phone: l.phone,
      state: !done ? 'running' : hit ? 'found' : 'not_found',
      external_id: done && hit ? hit.external_id : null,
      name: done && hit ? hit.name : null,
      error: null,
      created_at: l.created_at,
      expires_at: new Date(Date.parse(l.created_at) + 86_400_000).toISOString(),
    };
  };
};

export const resetChannelFriends = () => {
  friends.clear();
  lookups.clear();
  sent = used = seq = 0;
};
