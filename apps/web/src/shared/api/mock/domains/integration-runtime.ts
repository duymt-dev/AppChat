// Mock runtime kết nối (TIP-012b P3 §5.1): GET /integrations/connectors · /connections/:id · /logs · /calls/:callId + action
// integration.sync_now / integration.get / integration.list_calls — cùng hình packages/shared/api/integration-runtime. Kết nối giả theo
// thẻ đã kết nối (MOCK_CONN); Casso có kéo, SePay không (giống adapter thật). sync_now → biên nhận queued (accepted ≠ xong); lần đọc
// chi tiết thứ hai coi như worker đã chạy xong (succeeded + last_sync_at). Không bí mật / số tiền.
import { ApiRequestError, type CallLogPageDto, type CallReceiptDto, type ConnectionDetailDto, type RuntimeConnectorDto } from '@appchat/shared';
import type { MockRoute } from '../routes';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';

const PULL = new Set(['casso']);
/** Id kết nối giả cố định (uuid như server) theo connector. */
export const MOCK_CONN: Record<string, string> = { sepay: '0196f012-0000-7000-8000-00000000c501', casso: '0196f012-0000-7000-8000-00000000c502' };
const connId = (key: string) => MOCK_CONN[key] ?? null;
const BANK = new Set(['sepay', 'casso']);
const T0 = Date.parse('2026-11-08T08:00:00.000Z');
const iso = (n: number) => new Date(T0 + n * 60_000).toISOString();

type Rt = { calls: CallReceiptDto[]; synced: string | null; seq: number };
const state = new WeakMap<object, Record<string, Rt>>();

function rt(db: MockDb, key: string): Rt {
  let m = state.get(db.settingsApps);
  if (!m) state.set(db.settingsApps, (m = {}));
  return (m[key] ??= {
    synced: null,
    seq: 0,
    calls: [{ id: `call_${key}_probe`, op: 'connection.probe', status: 'succeeded', reason: null, attempts: 1, latency_ms: 420, created_at: iso(0), finished_at: iso(0), next_attempt_at: null }],
  });
}

function connected(db: MockDb, id: string) {
  const c = db.settingsApps.connectors.find((x) => connId(x.key) === id && x.connected && BANK.has(x.key));
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'not_found', fields: { connection: 'not_found' } });
  return c;
}

/** Worker giả: lượt queued đã được đọc thấy một lần (hiện "đang đồng bộ") → succeeded ở lần đọc kế tiếp. */
const seen = new WeakSet<CallReceiptDto>();
function settle(r: Rt) {
  for (const c of r.calls)
    if (c.status === 'queued' && !seen.has(c)) seen.add(c);
    else if (c.status === 'queued') {
      Object.assign(c, { status: 'succeeded', attempts: 1, latency_ms: 860, finished_at: iso(5 + r.seq), next_attempt_at: null, outcome: { pages: 1, fetched: 2, accepted: 1, duplicate: 1, ignored: 0, complete: true } });
      r.synced = c.finished_at;
    }
}

export function connectionDetail(db: MockDb, id: string): ConnectionDetailDto {
  const c = connected(db, id);
  const r = rt(db, c.key);
  const pending = r.calls.find((x) => x.status === 'queued') ?? null;
  const out: ConnectionDetailDto = {
    id,
    connector_key: c.key,
    name: c.name,
    port: 'bank_feed',
    mode: 'live',
    status: 'connected',
    health: PULL.has(c.key) ? 'verified' : 'configured_unverified',
    credential_rev: 1,
    capabilities: { webhook: true, probe: true, pull: PULL.has(c.key) },
    probe: PULL.has(c.key) ? { status: 'verified', reason: null, at: iso(0), current: true } : { status: 'unsupported', reason: 'no_read_key', at: iso(0), current: true },
    last_sync_at: r.synced,
    last_event_at: iso(-30),
    last_error: null,
    // Feed đối soát tiền theo dữ liệu thanh toán giả (bank_feed.connect / disconnect) — chưa gắn thì hiện "Đã tắt" + nút bật (P5).
    bank_binding: { active: db.invoices.bank_feeds.some((f) => f.provider === c.key && f.status === 'active'), account_masked: '••3456' },
    pending_call: pending ? { ...pending } : null,
    connected_at: iso(-60 * 24),
  };
  settle(r);
  return out;
}

function logs(db: MockDb, id: string, cursor?: string, limit = 20): CallLogPageDto {
  const r = rt(db, connected(db, id).key);
  // Danh sách không mang `outcome` (chỉ chi tiết lệnh có) — như server.
  const all = [...r.calls].reverse().map((x) => {
    const { outcome, ...rest } = x;
    void outcome;
    return rest;
  });
  const start = cursor ? Number(cursor) : 0;
  const items = all.slice(start, start + limit);
  return { items, next_cursor: start + limit < all.length ? String(start + limit) : null };
}

export const integrationRuntimeRoutes: Record<string, MockRoute> = {
  '/integrations/connectors': (db): RuntimeConnectorDto[] =>
    db.settingsApps.connectors
      .filter((c) => c.key !== 'web_widget')
      .map((c) => ({
        key: c.key,
        name: c.name,
        port: BANK.has(c.key) ? 'bank_feed' : 'mail',
        status: c.status as RuntimeConnectorDto['status'],
        modes: ['live', 'sandbox'],
        capabilities: { webhook: BANK.has(c.key), probe: BANK.has(c.key), pull: PULL.has(c.key) },
        connection_id: c.connected && BANK.has(c.key) ? connId(c.key) : null,
        health: c.connected && BANK.has(c.key) ? (PULL.has(c.key) ? 'verified' : 'configured_unverified') : null,
      })),
};

export const integrationRuntimeParamRoute = (path: string): MockRoute | null => {
  const m = path.match(/^\/integrations\/connections\/([^/]+)(?:\/(logs|calls)(?:\/([^/]+))?)?$/);
  if (!m) return null;
  const [, id, sub, callId] = m as unknown as [string, string, string | undefined, string | undefined];
  if (!sub) return (db) => connectionDetail(db, id);
  if (sub === 'logs')
    return (db, p) => {
      const pg = logs(db, id, p.cursor as string | undefined, Number(p.limit ?? 20));
      return { data: pg.items, next_cursor: pg.next_cursor };
    };
  return (db) => {
    const call = rt(db, connected(db, id).key).calls.find((c) => c.id === callId);
    if (!call) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'not_found' });
    return call;
  };
};

export const integrationRuntimeHandlers: Record<string, MockHandler> = {
  'integration.sync_now': {
    execute: (db, i: { connection_id: string }) => {
      const c = connected(db, i.connection_id);
      if (!PULL.has(c.key)) return { status: 'unsupported', call: null, reason: 'no_pull', coalesced: false };
      const r = rt(db, c.key);
      const pending = r.calls.find((x) => x.status === 'queued');
      if (pending) return { status: 'accepted', call: { ...pending }, coalesced: true };
      const call: CallReceiptDto = { id: `call_${c.key}_${++r.seq}`, op: 'bank.pull', status: 'queued', reason: null, attempts: 0, latency_ms: null, created_at: iso(4 + r.seq), finished_at: null, next_attempt_at: iso(4 + r.seq) };
      r.calls.push(call);
      return { status: 'accepted', call: { ...call }, coalesced: false };
    },
  },
  'integration.get': { execute: (db, i: { connection_id: string }) => connectionDetail(db, i.connection_id) },
  'integration.list_calls': { execute: (db, i: { connection_id: string; cursor?: string; limit?: number }) => logs(db, i.connection_id, i.cursor, i.limit) },
};

