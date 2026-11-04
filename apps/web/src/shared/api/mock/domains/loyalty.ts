// Mock Khách thân thiết (Blueprint §4.4 loyalty): GET /loyalty/config, /loyalty/overview, /loyalty/members?tier=&q=, /loyalty/members/:id,
// /loyalty/members/:id/files (+ /:fileId) — cùng zod `packages/shared/src/api/loyalty.ts` với server (TIP-036). Churn (J05) là P2 → rỗng
// như server; tệp theo thành viên (loyalty.attach_file với tệp vừa tải lên).
// Luật COMMERCE §7: 10.000đ = 1 điểm (cộng khi đơn hoàn tất), hạng 0 / 5.000 / 15.000 / 40.000 × 1 / 1 / 1,5 / 2, 1 điểm = 100đ.
// Hạng xét theo điểm tích 12 tháng (fixture coi `earned` là điểm tích trong cửa sổ). adjust_points cộng / trừ tay + 1 trong 7 lý do, có hoàn tác.
// Thêm thành viên mới = contact.create (domain customers) rồi loyalty.adjust_points — không có "hạng khởi tạo".
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/loyalty.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { paginate } from '../paginate';
import { mockUploads } from './contracts';

type Fixed = (typeof fixture.members)[number];
export type Member = Fixed & { can_redeem?: boolean; can_adjust?: boolean };
export interface MemberFile {
  file_id: string;
  name: string;
  ext: string;
  mime: string;
  size: number;
  created_by: string | null;
  created_at: string;
  at: string;
}
export type TierKey = 'member' | 'silver' | 'gold' | 'diamond';
type Config = typeof fixture.config;

export interface LoyaltyState {
  members: Member[];
  config: Config;
  /** Tệp theo thành viên (contact_id → tệp); tệp chung của fixture gắn cho thành viên đầu (ct_lan). */
  files: Record<string, MemberFile[]>;
}

const seedFiles = (): Record<string, MemberFile[]> => ({
  ct_lan: fixture.files.map(([name = '', ext = '', meta = ''], i) => ({ file_id: `lyf_${i + 1}`, name, ext, mime: ext === 'pdf' ? 'application/pdf' : 'image/jpeg', size: 1024, created_by: null, created_at: fixture.now, at: meta })),
});

export const createLoyaltyState = (): LoyaltyState => ({
  members: structuredClone(fixture.members),
  config: structuredClone(fixture.config),
  files: seedFiles(),
});

const withCan = (m: Member): Member => ({ ...m, can_redeem: m.points > 0, can_adjust: true });

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
const digits = (s: string) => s.replace(/\D/g, '');

/** Hạng theo điểm tích (COMMERCE §7: xét lại mỗi quý; mock xét ngay để thấy hiệu ứng). */
export const tierOf = (cfg: Config, earned: number): TierKey =>
  [...cfg.tiers].reverse().find((t) => earned >= t.min)!.key as TierKey;

const find = (db: MockDb, id: string) => {
  const m = db.loyalty.members.find((x) => x.contact_id === id);
  if (!m) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return m;
};

/** Khách CRM chưa vào chương trình: tạo thẻ thành viên rỗng (hạng Thành viên). */
const ensure = (db: MockDb, id: string): Member => {
  const hit = db.loyalty.members.find((x) => x.contact_id === id);
  if (hit) return hit;
  const c = db.customers.contacts.find((x) => x.id === id && !x.deleted);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  const m: Member = {
    contact_id: id,
    name: c.full_name,
    phone: c.phone,
    tier: 'member',
    points: 0,
    earned: 0,
    used: 0,
    spent: '0',
    status: 'new',
    joined: '06/2026',
    expiring: 0,
    ledger: [],
  };
  db.loyalty.members.push(m);
  return m;
};

export const loyaltyRoutes: Record<string, MockRoute> = {
  '/loyalty/config': (db) => db.loyalty.config,
  '/loyalty/overview': () => ({
    now: fixture.now,
    overview: fixture.overview,
    churn: [],
    rules: fixture.rules,
    files: [],
  }),
  '/loyalty/members': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const rows = db.loyalty.members.filter(
      (m) =>
        (!p.tier || p.tier === 'all' || m.tier === p.tier) &&
        (!q || [m.name, m.phone, digits(m.phone)].some((v) => norm(v).includes(q))),
    );
    return paginate(rows.map(withCan), p);
  },
  /** Tra cứu theo SĐT cho hộp "Thêm thành viên & ghi nhận điểm" (bước 1). */
  '/loyalty/lookup': (db, p) => {
    const d = digits(String(p.phone ?? ''));
    if (d.length < 9) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'phone', fields: { phone: 'min' } });
    const member = db.loyalty.members.find((m) => digits(m.phone) === d) ?? null;
    const contact = member ? null : (db.customers.contacts.find((c) => !c.deleted && digits(c.phone) === d) ?? null);
    return { member: member ? withCan(member) : null, contact: contact ? { id: contact.id, name: contact.full_name } : null };
  },
};

export const loyaltyParamRoute = (path: string): MockRoute | undefined => {
  const f = path.match(/^\/loyalty\/members\/([^/]+)\/files$/);
  if (f) return (db) => (find(db, f[1]!), db.loyalty.files[f[1]!] ?? []);
  const m = path.match(/^\/loyalty\/members\/([^/]+)$/);
  if (!m) return undefined;
  return (db) => withCan(find(db, m[1]!));
};

/** Nội dung tệp thành viên (mock: trang HTML tên tệp) — chỉ tệp gắn đúng thành viên. */
export function loyaltyFileBlob(db: MockDb, path: string): string | null {
  const m = path.match(/^\/loyalty\/members\/([^/]+)\/files\/([^/]+)$/);
  const f = m ? db.loyalty.files[m[1]!]?.find((x) => x.file_id === m[2]) : null;
  return f ? `<!doctype html><meta charset="utf-8"><title>${f.name}</title><p>${f.name}</p>` : null;
}

type AdjustIn = { contact_id: string; delta: number; reason: string; note?: string };

export const loyaltyHandlers: Record<string, MockHandler> = {
  'loyalty.get_member': {
    execute: (db, i: { contact_id: string }) => {
      const m = find(db, i.contact_id);
      return { contact_id: m.contact_id, points: m.points, tier: m.tier, expiring: m.expiring };
    },
  },
  'loyalty.adjust_points': {
    execute: (db, i: AdjustIn) => {
      const m = ensure(db, i.contact_id);
      if (m.points + i.delta < 0) {
        throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'balance', fields: { delta: 'exceeds_balance' } });
      }
      m.points += i.delta;
      if (i.delta > 0) m.earned += i.delta;
      else m.used -= i.delta;
      m.tier = tierOf(db.loyalty.config, m.earned);
      m.ledger.unshift({ kind: 'adjust', text: i.note ? `${i.reason} · ${i.note}` : i.reason, delta: i.delta, at: 'Vừa xong' });
      return { contact_id: m.contact_id, balance_after: m.points, tier: m.tier };
    },
    undo: (db, i: AdjustIn) => {
      const m = db.loyalty.members.find((x) => x.contact_id === i.contact_id);
      if (!m) return;
      m.points -= i.delta;
      if (i.delta > 0) m.earned -= i.delta;
      else m.used += i.delta;
      m.tier = tierOf(db.loyalty.config, m.earned);
      m.ledger.shift();
    },
  },
  'loyalty.attach_file': {
    execute: (db, i: { contact_id: string; file_id: string }) => {
      find(db, i.contact_id);
      const up = mockUploads.get(i.file_id);
      if (!up) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'file_id', fields: { file_id: 'not_found' } });
      const list = (db.loyalty.files[i.contact_id] ??= []);
      if (Object.values(db.loyalty.files).some((l) => l.some((x) => x.file_id === i.file_id))) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'file_id', fields: { file_id: 'attached' } });
      const ext = (up.name.split('.').pop() ?? '').toLowerCase();
      list.unshift({ file_id: i.file_id, name: up.name, ext, mime: 'application/octet-stream', size: up.size, created_by: null, created_at: new Date().toISOString(), at: 'Vừa xong' });
      return { contact_id: i.contact_id, file_id: i.file_id, name: up.name };
    },
    undo: (db, i: { contact_id: string; file_id: string }) => {
      const list = db.loyalty.files[i.contact_id];
      if (list) db.loyalty.files[i.contact_id] = list.filter((x) => x.file_id !== i.file_id);
    },
  },
  'loyalty.update_config': {
    execute: (db, i: { enabled?: boolean; tiers?: { key: string; mult: number }[]; marketplace_earn?: boolean }) => {
      const c = db.loyalty.config;
      if (i.enabled !== undefined) c.enabled = i.enabled;
      if (i.marketplace_earn !== undefined) c.marketplace_earn = i.marketplace_earn;
      if (i.tiers) c.tiers = c.tiers.map((t) => ({ ...t, mult: i.tiers!.find((x) => x.key === t.key)?.mult ?? t.mult }));
      return { ok: true };
    },
  },
};
