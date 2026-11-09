// Mock thùng rác khách (TIP-015f §5.3): GET /contacts/deleted (mới xoá trước, cursor, tìm tên không dấu / SĐT / mã) + contact.restore
// (còn hạn 30 × 24h, không trùng SĐT với khách đang sống — 409 không lộ khách kia; quá hạn → 409 restore_expired). Một khách mẫu đã
// quá hạn để có kịch bản `expired`. Thuần: customers.ts gọi `markDeleted` khi xoá, không import ngược.
import { ApiRequestError, foldText, type DeletedContact } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

const DAY = 86_400_000;
const WINDOW = 30 * DAY;

/** Trường vòng đời trên khách mock (bổ sung vào dòng fixture). */
export type LifecycleFields = { deleted?: boolean; deleted_at?: string; restore_until?: string };

type Row = LifecycleFields & { id: string; code: string; full_name: string; phone: string; owner_user_id: string | null };

const digits = (s: string) => s.replace(/\D/g, '').replace(/^84/, '0');

/** Gọi từ contact.delete: ghi mốc xoá + hạn khôi phục (xoá lại cùng lần giữ hạn cũ). */
export function markDeleted(c: LifecycleFields, now = Date.now()): { restore_until: string } {
  if (!c.deleted || !c.deleted_at) {
    c.deleted = true;
    c.deleted_at = new Date(now).toISOString();
    c.restore_until = new Date(now + WINDOW).toISOString();
  }
  return { restore_until: c.restore_until! };
}

/** Khách mẫu đã xoá quá 30 ngày (kịch bản expired) — thêm một lần khi đọc thùng rác lần đầu. */
function seedExpired(db: MockDb) {
  const rows = db.customers.contacts as unknown as Row[];
  if (rows.some((c) => c.id === 'kh_deleted_old')) return;
  const base = rows[rows.length - 1] as unknown as Record<string, unknown>;
  const at = Date.now() - 45 * DAY;
  rows.push({ ...(structuredClone(base) as unknown as Row), id: 'kh_deleted_old', code: 'KH-0999', full_name: 'Khách cũ đã xoá', phone: '+84 900 000 999', deleted: true, deleted_at: new Date(at).toISOString(), restore_until: new Date(at + WINDOW).toISOString() });
}

const toDto = (c: Row, now: number): DeletedContact => ({
  id: c.id,
  code: c.code,
  name: c.full_name,
  phone: c.phone || null,
  owner_user_id: c.owner_user_id,
  deleted_at: c.deleted_at!,
  restore_until: c.restore_until!,
  version: 1,
  status: Date.parse(c.restore_until!) > now ? 'restorable' : 'expired',
});

export const contactLifecycleRoutes: Record<string, MockRoute> = {
  '/contacts/deleted': (db, p) => {
    seedExpired(db);
    const now = Date.now();
    const q = foldText(String(p.q ?? '').trim());
    const qd = digits(String(p.q ?? ''));
    const limit = Math.min(Math.max(Number(p.limit ?? 30) || 30, 1), 100);
    const all = (db.customers.contacts as unknown as Row[])
      .filter((c) => c.deleted && c.deleted_at)
      .filter((c) => !q || foldText(c.full_name).includes(q) || c.code.toLowerCase() === q || (qd.length >= 6 && digits(c.phone) === qd))
      .sort((a, b) => b.deleted_at!.localeCompare(a.deleted_at!) || b.id.localeCompare(a.id));
    const start = p.cursor ? all.findIndex((c) => c.id === p.cursor) + 1 : 0;
    const page = all.slice(start, start + limit);
    return { data: page.map((c) => toDto(c, now)), next_cursor: start + limit < all.length ? page[page.length - 1]!.id : null };
  },
};

export const contactLifecycleHandlers: Record<string, MockHandler> = {
  'contact.restore': {
    execute: (db, i: { contact_id: string }) => {
      const rows = db.customers.contacts as unknown as Row[];
      const c = rows.find((x) => x.id === i.contact_id && x.deleted);
      if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: 'NOT_FOUND', fields: { contact_id: 'not_found' } });
      if (!c.restore_until || Date.parse(c.restore_until) <= Date.now()) throw new ApiRequestError(409, { code: 'INVALID_STATE', message: 'INVALID_STATE', fields: { contact_id: 'restore_expired' } });
      if (c.phone && rows.some((x) => x.id !== c.id && !x.deleted && digits(x.phone) === digits(c.phone))) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'CONFLICT', fields: { phone: 'taken' } });
      c.deleted = false;
      delete c.deleted_at;
      delete c.restore_until;
      return { contact_id: c.id, version: 2 };
    },
  },
};
