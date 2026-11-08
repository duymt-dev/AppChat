// Mock Báo giá (Blueprint §4.4 sales; COMMERCE-DECISIONS §3, §12): GET /quotes?status=&owner_id=&contact_id=&returning=&q=, /quotes/meta
// (?quote_id=), /quotes/:id, /quotes/:id/versions, /public/quotes/:token. Dữ liệu = prototype L7802 (fixture sinh bởi
// tools/scripts/fixtures/gen-quotes.py). Tổng tính bằng quoteTotals; shape = `quoteRowSchema` (packages/shared/src/api/quotes.ts).
// Handler ghi ở quotes-actions.ts (cùng bảng QUOTE_FLOW với server).
import { ApiRequestError, ROLE_DEFS, approvalReasons, quoteTotals, type ApprovalPolicy, type Discount, type QuoteRow } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/quotes.json';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { approvalPolicyOf } from './sales-policy';
import { paginate } from '../paginate';

type Fixed = (typeof fixture.quotes)[number];
export type QuoteStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'revision_requested'
  | 'rejected'
  | 'expired'
  | 'superseded';
export interface QuoteItem {
  product_id?: string;
  name: string;
  variant?: string;
  qty: number;
  unit_price: string;
  tax_rate: number;
  discount?: Discount | null;
}
export type Quote = Omit<
  Fixed,
  'status' | 'items' | 'header_discount' | 'sent_at' | 'converted' | 'comments'
> & {
  /** Người phụ trách vận hành (TIP-015d) — fixture prototype không có → mặc định = người tạo. */
  assigned_user_id?: string;
  assigned_name?: string;
  comments: { who: string; text: string; at: string }[];
  status: QuoteStatus;
  items: QuoteItem[];
  header_discount: Discount | null;
  sent_at: string | null;
  converted: { kind: 'order' | 'contract'; id: string } | null;
  deleted?: boolean;
  /** Hạn đã chốt lúc gửi / gia hạn (ISO); chưa gửi → dự kiến nếu gửi hôm nay. */
  valid_until_at?: string;
  viewed_at?: string | null;
};

export interface QuotesState {
  quotes: Quote[];
  seq: number;
}

export const createQuotesState = (): QuotesState => ({
  quotes: structuredClone(fixture.quotes) as Quote[],
  seq: 2041,
});

const DAY = 86_400_000;
/** Đồng hồ cố định của parity (prototype-parity §4). */
export const MOCK_NOW = '2026-06-24T09:00:00+07:00';

/** scopeFilter(ctx,'sales'): `own` = báo giá mình phụ trách (D32). */
const visible = (db: MockDb, q: Quote) => {
  if (q.deleted || q.status === 'superseded') return false;
  const scope = ROLE_DEFS[db.role].scope.sales;
  return scope === 'all' || (scope === 'own' && (q.assigned_user_id ?? q.owner_user_id) === ME);
};

/** Cuối ngày (mốc + N) theo giờ VN — mock đồng hồ cố định (server dùng dayEndAfter theo giờ workspace). */
export const validUntilOf = (from: string, days: number) => {
  const d = new Date(new Date(from).getTime() + 7 * 3_600_000 + days * DAY);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999) - 7 * 3_600_000).toISOString();
};

export const enrich = (q: Quote, policy?: ApprovalPolicy): QuoteRow => {
  const totals = quoteTotals(q.items, q.header_discount);
  const { converted, valid_until_at, viewed_at: _v, deleted: _d, ...rest } = q;
  return {
    ...rest,
    assigned_user_id: q.assigned_user_id ?? q.owner_user_id,
    assigned_name: q.assigned_name ?? q.owner_name,
    ...totals,
    converted: converted?.kind ?? null,
    valid_until: valid_until_at ?? validUntilOf(q.sent_at ?? MOCK_NOW, q.valid_days),
    approval_reasons: approvalReasons(totals, { offCatalog: q.off_catalog, policy }),
  };
};

export const find = (db: MockDb, id: string) => {
  const q = db.quotes.quotes.find((x) => x.id === id && !x.deleted);
  if (!q) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return q;
};

export const quotesRoutes: Record<string, MockRoute> = {
  '/quotes': (db, p) => {
    const s = String(p.q ?? '')
      .trim()
      .toLowerCase();
    const rows = db.quotes.quotes.filter(
      (q) =>
        visible(db, q) &&
        (!p.status || p.status === 'all' || q.status === p.status) &&
        (!p.owner_id || p.owner_id === 'all' || q.owner_user_id === p.owner_id) &&
        (!p.assigned_user_id || p.assigned_user_id === 'all' || (q.assigned_user_id ?? q.owner_user_id) === p.assigned_user_id) &&
        (!p.contact_id || q.contact_id === p.contact_id) &&
        (!p.returning || p.returning === 'all' || String(q.returning) === String(p.returning === 'old')) &&
        (!s || [q.code, q.contact_name, q.items[0]?.name ?? ''].some((v) => v.toLowerCase().includes(s))),
    );
    return paginate(rows.map((x) => enrich(x, approvalPolicyOf(db))), p);
  },
  '/quotes/meta': (db) => {
    const all = db.quotes.quotes.filter((q) => visible(db, q));
    const counts: Record<string, number> = { all: all.length };
    for (const q of all) counts[q.status] = (counts[q.status] ?? 0) + 1;
    // Số liệu theo báo giá (?quote_id=) mock dùng chung bộ mẫu của prototype.
    return {
      counts,
      stats: {
        total: all.length,
        approved: counts.approved ?? 0,
        waiting: (counts.sent ?? 0) + (counts.viewed ?? 0),
        close_rate: fixture.close_rate,
      },
      crm_stats: fixture.crm_stats,
      timeline: fixture.timeline,
      todos: fixture.todos,
      history: fixture.history,
      ai_runs: fixture.ai_runs,
    };
  },
};

export const quotesParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/quotes\/(q_[^/]+)(\/versions)?$/);
  if (!m) return undefined;
  return (db) => {
    const q = find(db, m[1]!);
    if (!m[2]) return enrich(q, approvalPolicyOf(db));
    // Các version cùng gốc (request_revision tạo n+1, bản cũ = superseded)
    return db.quotes.quotes
      .filter((x) => x.root_id === q.root_id && !x.deleted)
      .sort((a, b) => b.version - a.version)
      .map((x) => enrich(x, approvalPolicyOf(db)));
  };
};
