// Mock tài nguyên GenUI (TIP-023c): `channel.status` (vòng đời QR theo attempt: waiting → scanned → connected), ảnh QR của đúng attempt
// (`/assistant/ui/qr/:accountId?attempt=`), `assistant.resume` (server kiểm tài khoản đã connected + attempt), `/assistant/ui/refs`.
import { ApiRequestError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { findAccount, MOCK_QR } from './settings-apps';

/** Attempt hiện hành của mỗi tài khoản đang đăng nhập (ngoài state chính — chỉ phục vụ mock khối qr). */
const attempts = new Map<string, { id: string; polls: number }>();

const attemptOf = (accountId: string) => {
  let a = attempts.get(accountId);
  if (!a) {
    a = { id: `att_${Date.now().toString(36)}`, polls: 0 };
    attempts.set(accountId, a);
  }
  return a;
};

function status(db: MockDb, accountId: string) {
  const { channel, account } = findAccount(db, accountId);
  const base = { channel_account_id: account.id, type: channel.type, name: account.name };
  const pending = db.settingsApps.pendingLogin[account.id] !== undefined;
  if (!pending) {
    attempts.delete(account.id);
    const st = account.connected ? 'connected' : 'expired';
    return { ...base, account_status: st, login: { attempt: null, status: st, expires_at: null, qr_ref: null, terminal: true } };
  }
  const a = attemptOf(account.id);
  a.polls++;
  // Lần 1–2: chờ quét; lần 3: đã quét; lần 4: kết nối xong (giả lập điện thoại quét).
  if (a.polls >= 4) {
    delete db.settingsApps.pendingLogin[account.id];
    account.connected = true;
    account.health = 'good';
    return { ...base, account_status: 'connected', login: { attempt: a.id, status: 'connected', expires_at: null, qr_ref: null, terminal: true } };
  }
  const st = a.polls === 3 ? 'scanned' : 'waiting';
  const expires = new Date(Date.now() + 100_000).toISOString();
  return { ...base, account_status: 'connecting', login: { attempt: a.id, status: st, expires_at: expires, qr_ref: st === 'waiting' ? `/assistant/ui/qr/${account.id}?attempt=${a.id}` : null, terminal: false } };
}

export const assistantUiHandlers: Record<string, MockHandler> = {
  'channel.status': { execute: (db, i: { channel_account_id: string }) => status(db, i.channel_account_id) },
  'assistant.resume': {
    execute: (db, i: { channel_account_id: string; attempt: string }) => {
      const { account } = findAccount(db, i.channel_account_id);
      return account.connected ? { resumed: true, status: 'connected' } : { resumed: false, status: 'not_connected' };
    },
  },
};

/** GET /assistant/ui/qr/:accountId?attempt= — chỉ attempt hiện hành, đang chờ. */
export const assistantUiParamRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/assistant\/ui\/qr\/([^/?]+)$/);
  if (!m) return null;
  return (_db, p) => {
    const a = attempts.get(m[1]!);
    if (!a || a.id !== String(p.attempt ?? '') || a.polls >= 3) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'qr' });
    return { png_base64: MOCK_QR, expires_at: new Date(Date.now() + 100_000).toISOString() };
  };
};

/** POST /assistant/ui/refs — mock không có bước run thật: mọi ref ngoài cây fixture → không có dữ liệu. */
export const assistantUiPosts: Record<string, (db: MockDb, body: Record<string, unknown>) => unknown> = {
  '/assistant/ui/refs': (_db, body) => Object.fromEntries((Array.isArray(body.refs) ? body.refs : []).map((r) => [String(r), { unavailable: true }])),
};
