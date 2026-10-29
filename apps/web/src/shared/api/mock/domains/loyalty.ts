// Mock Khách thân thiết (Blueprint §4.4 loyalty): GET /loyalty/config, /loyalty/overview, /loyalty/members?tier=&q=, /loyalty/members/:id.
// Luật COMMERCE §7: 10.000đ = 1 điểm (cộng khi đơn hoàn tất), hạng 0 / 5.000 / 15.000 / 40.000 × 1 / 1 / 1,5 / 2, 1 điểm = 100đ.
// Hạng xét theo điểm tích 12 tháng (fixture coi `earned` là điểm tích trong cửa sổ). adjust_points cộng / trừ tay + 1 trong 7 lý do, có hoàn tác.
// Thêm thành viên mới = contact.create (domain customers) rồi loyalty.adjust_points — không có "hạng khởi tạo".
import { ApiRequestError } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/loyalty.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { paginate } from '../paginate';

type Fixed = (typeof fixture.members)[number];
export type Member = Fixed;
export type TierKey = 'member' | 'silver' | 'gold' | 'diamond';
type Config = typeof fixture.config;

export interface LoyaltyState {
  members: Member[];
  config: Config;
}

export const createLoyaltyState = (): LoyaltyState => ({
  members: structuredClone(fixture.members),
  config: structuredClone(fixture.config),
});

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
    churn: fixture.churn,
    rules: fixture.rules,
    files: fixture.files,
  }),
  '/loyalty/members': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const rows = db.loyalty.members.filter(
      (m) =>
        (!p.tier || p.tier === 'all' || m.tier === p.tier) &&
        (!q || [m.name, m.phone, digits(m.phone)].some((v) => norm(v).includes(q))),
    );
    return paginate(rows, p);
  },
  /** Tra cứu theo SĐT cho hộp "Thêm thành viên & ghi nhận điểm" (bước 1). */
  '/loyalty/lookup': (db, p) => {
    const d = digits(String(p.phone ?? ''));
    if (d.length < 9) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'phone', fields: { phone: 'min' } });
    const member = db.loyalty.members.find((m) => digits(m.phone) === d) ?? null;
    const contact = member ? null : (db.customers.contacts.find((c) => !c.deleted && digits(c.phone) === d) ?? null);
    return { member, contact: contact ? { id: contact.id, name: contact.full_name } : null };
  },
};

export const loyaltyParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/loyalty\/members\/([^/]+)$/);
  if (!m) return undefined;
  return (db) => find(db, m[1]!);
};

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
