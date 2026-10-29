// Mock Báo giá (Blueprint §4.4 sales; COMMERCE-DECISIONS §3, §12): GET /quotes?status=&owner_id=&returning=&q=, /quotes/meta, /quotes/:id.
// Dữ liệu = prototype L7802 (fixture sinh bởi tools/scripts/fixtures/gen-quotes.py). Tổng tính bằng quoteTotals (thuế sau chiết khấu).
import {
  ApiRequestError,
  ROLE_DEFS,
  approvalReasons,
  quoteTotals,
  type Discount,
  type ErrorCode,
} from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/quotes.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { draftFromContent } from './quotes-draft';
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
  comments: { who: string; text: string; at: string }[];
  status: QuoteStatus;
  items: QuoteItem[];
  header_discount: Discount | null;
  sent_at: string | null;
  converted: { kind: 'order' | 'contract'; id: string } | null;
  deleted?: boolean;
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
  return scope === 'all' || (scope === 'own' && q.owner_user_id === ME);
};

export const enrich = (q: Quote) => {
  const totals = quoteTotals(q.items, q.header_discount);
  const base = q.sent_at ?? q.created_at;
  return {
    ...q,
    ...totals,
    valid_until: new Date(new Date(base).getTime() + q.valid_days * DAY).toISOString(),
    approval_reasons: approvalReasons(totals, { offCatalog: q.off_catalog }),
  };
};

const find = (db: MockDb, id: string) => {
  const q = db.quotes.quotes.find((x) => x.id === id && !x.deleted);
  if (!q) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return q;
};
const deny = (code: ErrorCode, message: string) => {
  throw new ApiRequestError(409, { code, message });
};
const need = (q: Quote, ...st: QuoteStatus[]) => {
  if (!st.includes(q.status)) deny('INVALID_STATE', `${q.code}: ${q.status}`);
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
        (!p.contact_id || q.contact_id === p.contact_id) &&
        (!p.returning || p.returning === 'all' || String(q.returning) === String(p.returning === 'old')) &&
        (!s || [q.code, q.contact_name, q.items[0]?.name ?? ''].some((v) => v.toLowerCase().includes(s))),
    );
    return paginate(rows.map(enrich), p);
  },
  '/quotes/meta': (db) => {
    const all = db.quotes.quotes.filter((q) => visible(db, q));
    const counts: Record<string, number> = { all: all.length };
    for (const q of all) counts[q.status] = (counts[q.status] ?? 0) + 1;
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
    if (!m[2]) return enrich(q);
    // Các version cùng gốc (request_revision tạo n+1, bản cũ = superseded)
    return db.quotes.quotes
      .filter((x) => x.root_id === q.root_id && !x.deleted)
      .sort((a, b) => b.version - a.version)
      .map(enrich);
  };
};

type Fields = Partial<
  Pick<
    Quote,
    | 'contact_id'
    | 'owner_user_id'
    | 'items'
    | 'header_discount'
    | 'valid_days'
    | 'payment_terms'
    | 'note'
    | 'gift'
  >
>;

const insert = (
  db: MockDb,
  i: Fields & { contact_id: string; items: QuoteItem[] },
  extra: Partial<Quote> = {},
) => {
  const n = ++db.quotes.seq;
  const contact = db.customers.contacts.find((c) => c.id === i.contact_id);
  const owner = i.owner_user_id ?? ME;
  const q: Quote = {
    id: `q_${n}`,
    code: `BG-${n}`,
    version: 1,
    root_id: `q_${n}`,
    contact_id: i.contact_id,
    contact_name: contact?.full_name ?? i.contact_id,
    phone: contact?.phone ?? '',
    returning: contact?.stage === 'won',
    owner_user_id: owner,
    owner_name: db.customers.contacts.length ? (owner === ME ? 'Trâm' : owner) : owner,
    status: 'draft',
    items: i.items,
    header_discount: i.header_discount ?? null,
    valid_days: i.valid_days ?? 15,
    created_at: MOCK_NOW,
    sent_at: null,
    note: i.note ?? '',
    gift: i.gift ?? '',
    payment_terms: i.payment_terms ?? '',
    comments: [],
    ai: { hint: '', wait: false },
    off_catalog: false,
    converted: null,
    ...extra,
  };
  db.quotes.quotes.unshift(q);
  return q;
};

const setStatus = (st: QuoteStatus, from: QuoteStatus[]) => ({
  execute: (db: MockDb, i: { quote_id: string }) => {
    const q = find(db, i.quote_id);
    need(q, ...from);
    q.status = st;
    return { quote_id: q.id, status: st };
  },
});

export const quotesHandlers: Record<string, MockHandler> = {
  'quote.create': {
    execute: (db, i: Fields & { contact_id: string; items: QuoteItem[] }) => {
      const q = insert(db, i);
      return { quote_id: q.id, code: q.code };
    },
    undo: (db) => {
      db.quotes.quotes.shift();
    },
  },
  'quote.update': {
    execute: (db, i: { quote_id: string; patch: Fields }) => {
      const q = find(db, i.quote_id);
      need(q, 'draft', 'revision_requested', 'pending_approval');
      Object.assign(q, i.patch);
      // Sửa sau khi gửi duyệt thì quay lại nháp (phải duyệt lại).
      if (q.status === 'pending_approval') q.status = 'draft';
      return { quote_id: q.id };
    },
  },
  'quote.delete': {
    execute: (db, i: { quote_id: string }) => {
      const q = find(db, i.quote_id);
      need(q, 'draft', 'revision_requested');
      q.deleted = true;
      return { quote_id: q.id };
    },
    undo: (db, i: { quote_id: string }) => {
      const q = db.quotes.quotes.find((x) => x.id === i.quote_id);
      if (q) q.deleted = false;
    },
  },
  'quote.submit_for_approval': setStatus('pending_approval', ['draft', 'revision_requested']),
  'quote.approve': setStatus('approved', ['pending_approval', 'draft']),
  'quote.reject_internal': setStatus('draft', ['pending_approval']),
  'quote.send': {
    execute: (db, i: { quote_id: string }) => {
      const q = find(db, i.quote_id);
      need(q, 'draft', 'approved', 'revision_requested', 'sent', 'viewed');
      if (
        q.status !== 'approved' &&
        approvalReasons(quoteTotals(q.items, q.header_discount), { offCatalog: q.off_catalog }).length
      )
        deny('QUOTE_NEEDS_APPROVAL', q.code);
      q.status = 'sent';
      q.sent_at = MOCK_NOW;
      return { quote_id: q.id, valid_until: enrich(q).valid_until };
    },
  },
  'quote.request_revision': {
    execute: (db, i: { quote_id: string }) => {
      const q = find(db, i.quote_id);
      need(q, 'sent', 'viewed', 'approved', 'rejected');
      q.status = 'superseded';
      const next = insert(db, q, {
        root_id: q.root_id,
        version: q.version + 1,
        status: 'draft',
        owner_name: q.owner_name,
        comments: [...q.comments],
        gift: q.gift,
      });
      next.code = q.code;
      db.quotes.seq--;
      next.id = `${q.root_id}_v${next.version}`;
      return { quote_id: next.id, code: next.code, version: next.version };
    },
  },
  'quote.mark_accepted': setStatus('accepted', ['sent', 'viewed', 'approved']),
  'quote.mark_rejected': setStatus('rejected', ['sent', 'viewed', 'approved']),
  'quote.extend_validity': {
    execute: (db, i: { quote_id: string; days: number }) => {
      const q = find(db, i.quote_id);
      q.valid_days += i.days;
      if (q.status === 'expired') q.status = 'sent';
      return { quote_id: q.id, valid_until: enrich(q).valid_until };
    },
  },
  'quote.comment': {
    execute: (db, i: { quote_id: string; text: string }) => {
      find(db, i.quote_id).comments.push({ who: 'Sale · Trâm', text: i.text, at: MOCK_NOW });
      return { quote_id: i.quote_id };
    },
    undo: (db, i: { quote_id: string }) => {
      db.quotes.quotes.find((x) => x.id === i.quote_id)?.comments.pop();
    },
  },
  'quote.draft_from_content': {
    execute: (db, i: { contact_id: string; content: string }) => {
      const d = draftFromContent(db, i.content);
      const q = insert(
        db,
        {
          contact_id: i.contact_id,
          items: d.items,
          header_discount: d.discount,
          note: i.content.slice(0, 200),
        },
        { off_catalog: d.offCatalog > 0, created_by_ai: true } as Partial<Quote>,
      );
      return { quote_id: q.id, code: q.code, off_catalog: d.offCatalog };
    },
    undo: (db) => {
      db.quotes.quotes.shift();
    },
  },
};
