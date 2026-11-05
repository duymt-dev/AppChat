// Ghi Báo giá ở mock — cùng bảng QUOTE_FLOW với server (state-machine §1.3): sai trạng thái → INVALID_TRANSITION 409; vượt ngưỡng mà
// chưa duyệt → QUOTE_NEEDS_APPROVAL; gửi đặt hạn = cuối ngày (gửi + valid_days); xin sửa → bản hiện tại `revision_requested`, sinh
// lần n+1 nháp cùng mã, bản cũ `superseded` khi bản mới được gửi (D46); gia hạn bản đã hết hạn → `sent`.
import { ApiRequestError, QUOTE_FLOW, approvalReasons, assertTransition, quoteTotals, type AppError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';
import { ME } from './customers';
import { approvalPolicyOf } from './sales-policy';
import { draftFromContent } from './quotes-draft';
import { MOCK_NOW, enrich, find, validUntilOf, type Quote, type QuoteItem } from './quotes';

type Fields = Partial<Pick<Quote, 'contact_id' | 'owner_user_id' | 'items' | 'header_discount' | 'valid_days' | 'payment_terms' | 'note' | 'gift'>>;

const deny = (code: 'QUOTE_NEEDS_APPROVAL' | 'INVALID_TRANSITION', status: string): never => {
  throw new ApiRequestError(409, { code, message: code, fields: { status } });
};

/** assertTransition của flow chung → lỗi API của mock. */
const step = (q: Quote, action: string) => {
  try {
    return assertTransition(QUOTE_FLOW, q.status, action);
  } catch (e) {
    return deny('INVALID_TRANSITION', (e as AppError).fields?.status ?? q.status);
  }
};

const newer = (db: MockDb, q: Quote) => db.quotes.quotes.some((x) => x.root_id === q.root_id && x.version > q.version && !x.deleted);

const insert = (db: MockDb, i: Fields & { contact_id: string; items: QuoteItem[] }, extra: Partial<Quote> = {}) => {
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
    owner_name: owner === ME ? 'Trâm' : owner,
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

const move = (action: string, extra: (q: Quote) => Partial<Quote> = () => ({})) => ({
  execute: (db: MockDb, i: { quote_id: string }) => {
    const q = find(db, i.quote_id);
    const to = step(q, action);
    Object.assign(q, extra(q), { status: to });
    return { quote_id: q.id, status: to };
  },
});

/** Hoàn tác chốt / từ chối: về trạng thái trước (sent / viewed). */
const undoDecision = (db: MockDb, i: { quote_id: string }) => {
  const q = db.quotes.quotes.find((x) => x.id === i.quote_id);
  if (q) q.status = q.viewed_at ? 'viewed' : 'sent';
};

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
      step(q, 'quote.update');
      Object.assign(q, i.patch);
      return { quote_id: q.id };
    },
  },
  'quote.delete': {
    execute: (db, i: { quote_id: string }) => {
      const q = find(db, i.quote_id);
      step(q, 'quote.delete');
      if (q.sent_at) deny('INVALID_TRANSITION', 'sent');
      q.deleted = true;
      // Xoá bản sửa → bản trước quay lại trạng thái đã gửi.
      const prev = db.quotes.quotes.find((x) => x.root_id === q.root_id && x.version === q.version - 1 && x.status === 'revision_requested');
      if (prev) prev.status = prev.viewed_at ? 'viewed' : 'sent';
      return { quote_id: q.id };
    },
    undo: (db, i: { quote_id: string }) => {
      const q = db.quotes.quotes.find((x) => x.id === i.quote_id);
      if (!q) return;
      q.deleted = false;
      const prev = db.quotes.quotes.find((x) => x.root_id === q.root_id && x.version === q.version - 1 && !x.deleted);
      if (prev && (prev.status === 'sent' || prev.status === 'viewed')) prev.status = 'revision_requested';
    },
  },
  'quote.submit_for_approval': move('quote.submit_for_approval'),
  'quote.approve': move('quote.approve'),
  'quote.reject_internal': move('quote.reject_internal'),
  'quote.send': {
    execute: (db, i: { quote_id: string }) => {
      const q = find(db, i.quote_id);
      const to = step(q, 'quote.send');
      if (q.status === 'draft' && approvalReasons(quoteTotals(q.items, q.header_discount), { offCatalog: q.off_catalog, policy: approvalPolicyOf(db) }).length) deny('QUOTE_NEEDS_APPROVAL', q.status);
      Object.assign(q, { status: to, sent_at: MOCK_NOW, valid_until_at: validUntilOf(MOCK_NOW, q.valid_days) });
      for (const x of db.quotes.quotes) if (x.root_id === q.root_id && x.version < q.version && x.status === 'revision_requested') x.status = 'superseded';
      return { quote_id: q.id, valid_until: enrich(q).valid_until };
    },
  },
  'quote.request_revision': {
    execute: (db, i: { quote_id: string }) => {
      const q = find(db, i.quote_id);
      step(q, 'quote.request_revision');
      if (newer(db, q)) deny('INVALID_TRANSITION', q.status);
      q.status = 'revision_requested';
      const next = insert(db, q, {
        id: `${q.root_id}_v${q.version + 1}`,
        code: q.code,
        root_id: q.root_id,
        version: q.version + 1,
        owner_name: q.owner_name,
        comments: [...q.comments],
        gift: q.gift,
        off_catalog: q.off_catalog,
      });
      db.quotes.seq--;
      return { quote_id: next.id, code: next.code, version: next.version };
    },
  },
  'quote.mark_accepted': { ...move('quote.mark_accepted'), undo: undoDecision },
  'quote.mark_rejected': { ...move('quote.mark_rejected'), undo: undoDecision },
  'quote.extend_validity': {
    execute: (db, i: { quote_id: string; days: number }) => {
      const q = find(db, i.quote_id);
      const to = step(q, 'quote.extend_validity');
      if (newer(db, q)) deny('INVALID_TRANSITION', q.status);
      const cur = enrich(q).valid_until;
      const base = q.status === 'expired' || cur < MOCK_NOW ? MOCK_NOW : cur;
      Object.assign(q, { status: to, valid_until_at: validUntilOf(base, i.days) });
      return { quote_id: q.id, valid_until: enrich(q).valid_until };
    },
  },
  'quote.comment': {
    execute: (db, i: { quote_id: string; text: string }) => {
      find(db, i.quote_id).comments.push({ who: 'Trâm', text: i.text, at: MOCK_NOW });
      return { quote_id: i.quote_id };
    },
    undo: (db, i: { quote_id: string }) => {
      db.quotes.quotes.find((x) => x.id === i.quote_id)?.comments.pop();
    },
  },
  'quote.draft_from_content': {
    execute: (db, i: { contact_id: string; content: string }) => {
      const d = draftFromContent(db, i.content);
      const q = insert(db, { contact_id: i.contact_id, items: d.items, header_discount: d.discount, note: i.content.slice(0, 200) }, { off_catalog: d.offCatalog > 0 });
      return { quote_id: q.id, code: q.code, off_catalog: d.offCatalog };
    },
    undo: (db) => {
      db.quotes.quotes.shift();
    },
  },
};
