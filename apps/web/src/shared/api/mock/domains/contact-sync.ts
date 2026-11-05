// Mock đồng bộ danh bạ Zalo (TIP-014b D3) — như server: `channel.sync_contacts` trên tài khoản Zalo đang chạy → 202 job_accepted +
// `/settings/channels/:id/contact-syncs/:syncId`; lần đọc đầu `running`, lần sau `complete` với danh bạ mẫu (có người thiếu SĐT, người đã
// là khách theo SĐT). Kênh khác → 422; tài khoản tạm dừng / chưa kết nối → 409. Không tạo khách — nhập là `contact.import` riêng.
import { ApiRequestError, normalizePhone } from '@appchat/shared';

/** Store mock (cấu trúc — không import store: tránh vòng phụ thuộc). */
type MockDb = {
  settingsApps: { channels: { type: string; accounts: { id: string; connected: boolean; paused?: boolean }[] }[] };
  customers?: { contacts?: { id: string; phone?: string }[] };
};

type Run = { id: string; account: string; polls: number; created_at: string };
const runs = new Map<string, Run>();
let seq = 0;

const BOOK = [
  { external_id: '7300000001', name: 'Chị Mai Anh', phone: '0912 345 678' },
  { external_id: '7300000002', name: 'Anh Tuấn', phone: null },
  { external_id: '7300000003', name: 'Cô Hạnh', phone: '0987 111 222' },
];

const fail = (status: number, field: string) => new ApiRequestError(status, { code: status === 409 ? 'CONFLICT' : 'VALIDATION_FAILED', message: field, fields: { channel_account_id: field } });

export function requestContactSync(db: MockDb, accountId: string) {
  const ch = db.settingsApps.channels.find((c) => c.accounts.some((a) => a.id === accountId));
  const acc = ch?.accounts.find((a) => a.id === accountId);
  if (!ch || !acc) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'channel_account_id', fields: { channel_account_id: 'not_found' } });
  if (ch.type !== 'zalo_personal') throw fail(422, 'contacts_unsupported');
  if (!acc.connected || acc.paused) throw fail(409, 'not_running');
  const id = `0190f00c-0000-7000-8000-${String(++seq).padStart(12, '0')}`;
  runs.set(id, { id, account: accountId, polls: 0, created_at: new Date().toISOString() });
  return { ok: true, __accepted: { job_id: id, status_url: `/v1/settings/channels/${accountId}/contact-syncs/${id}` } };
}

export const contactSyncRoute = (path: string): ((db: MockDb) => unknown) | undefined => {
  const m = path.match(/^\/settings\/channels\/([^/]+)\/contact-syncs\/([0-9a-f-]{36})$/);
  if (!m) return undefined;
  return (db) => {
    const r = runs.get(m[2]!);
    if (!r || r.account !== m[1]) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'sync_id', fields: { sync_id: 'not_found' } });
    const done = ++r.polls > 1;
    const phones = new Map((db.customers?.contacts ?? []).map((c) => [normalizePhone(c.phone), c.id]));
    const rows = done
      ? BOOK.map((b) => {
          const p = normalizePhone(b.phone) || null;
          const hit = p ? phones.get(p) : undefined;
          return { external_id: b.external_id, name: b.name, phone: p, state: !p ? 'no_phone' : hit ? 'known' : 'importable', contact_id: hit ?? null };
        })
      : [];
    return {
      id: r.id,
      channel_account_id: r.account,
      state: done ? 'complete' : 'running',
      pages: done ? 1 : 0,
      received: rows.length,
      error: null,
      created_at: r.created_at,
      finished_at: done ? new Date().toISOString() : null,
      expires_at: new Date(Date.parse(r.created_at) + 86_400_000).toISOString(),
      rows,
      next_cursor: null,
    };
  };
};

export const resetContactSyncs = () => {
  runs.clear();
  seq = 0;
};
