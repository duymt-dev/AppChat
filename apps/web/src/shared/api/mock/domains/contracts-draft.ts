// Mock AI soạn hợp đồng hai bước (TIP-030b F2) — cùng hợp đồng http: `contract.prepare_draft` (dòng "tên xN" / dấu phẩy của brief khớp
// danh mục theo tên → giá catalog, không khớp → off_catalog giá 0; "ĐIỀU KHOẢN: …" → gợi ý; cùng request_key → cùng đề xuất),
// `contract.draft_from_content` (một nháp mỗi đề xuất, gợi ý pending), `contract.resolve_suggestion` (CAS version) + cổng trình duyệt.
import { ApiRequestError } from '@appchat/shared';

type Kind = 'service' | 'sale' | 'framework';
/** Phần MockDb luồng soạn đọc (danh mục + khách) — không import `../store` (store → handlers → contracts-actions → đây). */
type MockDb = {
  products: { products: { id: string; name: string; price: string | number; deleted?: boolean | string | null }[] };
  customers: { contacts: { id: string }[] };
};
/** Phần hợp đồng mock mà luồng soạn dùng — không import `./contracts` (tránh vòng import mock). */
type DraftContract = { id: string; code: string; status: string; created_at: string; events?: unknown[]; ai_suggestions?: AiSuggestion[] };
type NewContract = { contact_id: string; kind: Kind; title: string; value: string; start_date: string | null; end_date: string | null };

type Line = { name: string; qty: number; unit_price: string; product_id: string | null; off_catalog: boolean };
interface Proposal {
  proposal_id: string;
  key: string;
  contact_id: string;
  kind: Kind;
  title: string;
  value: string;
  start_date: string | null;
  end_date: string | null;
  lines: Line[];
  suggestions: { id: string; text: string }[];
  off_catalog: number;
  content_hash: string;
  expires_at: string;
  consumed: string | null;
}
export type AiSuggestion = { id: string; text: string; status: 'pending' | 'kept' | 'discarded'; version: number };

const proposals = new Map<string, Proposal>();
const DATE = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

function propose(db: MockDb, i: { contact_id: string; kind?: Kind; brief: string; request_key: string }): Proposal {
  const dates = [...i.brief.matchAll(DATE)].map((m) => `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`);
  const suggestions = [...i.brief.matchAll(/^ĐIỀU KHOẢN: (.+)$/gm)].map((m, n) => ({ id: `s${n + 1}`, text: m[1]!.trim() }));
  const body = i.brief.replace(/^ĐIỀU KHOẢN: .+$/gm, '').replace(DATE, ' ');
  const lines: Line[] = [];
  for (const raw of body.split(/,|\n|\+/)) {
    const m = /^\s*-?\s*(.+?)(?:\s+x(\d+))?\s*$/.exec(raw);
    const text = m?.[1]?.replace(/\b(từ|đến|Thời hạn)\b/gi, '').trim() ?? '';
    if (fold(text).replace(/[^a-z]/g, '').length < 4) continue;
    const qty = Number(m?.[2] ?? 1);
    const p = db.products.products.find((x) => !x.deleted && fold(text).includes(fold(x.name)));
    lines.push(p ? { name: p.name, qty, unit_price: String(p.price), product_id: p.id, off_catalog: false } : { name: text, qty, unit_price: '0', product_id: null, off_catalog: true });
  }
  const value = String(lines.reduce((s, l) => s + Number(l.unit_price) * l.qty, 0));
  return {
    proposal_id: `prp_${proposals.size + 1}`,
    key: i.request_key,
    contact_id: i.contact_id,
    kind: i.kind ?? 'service',
    title: lines.map((l) => l.name).join(', ').slice(0, 200) || i.brief.slice(0, 80),
    value,
    start_date: dates[0] ?? null,
    end_date: dates[1] && dates[1] > dates[0]! ? dates[1] : null,
    lines,
    suggestions,
    off_catalog: lines.filter((l) => l.off_catalog).length,
    content_hash: `mock${proposals.size.toString(16).padStart(60, '0')}`,
    expires_at: '2099-01-01T00:00:00.000Z',
    consumed: null,
  };
}

/** Phản hồi như server (không lộ khoá yêu cầu / trạng thái tiêu thụ). */
const view = (p: Proposal) => ({ proposal_id: p.proposal_id, content_hash: p.content_hash, expires_at: p.expires_at, title: p.title, value: p.value, start_date: p.start_date, end_date: p.end_date, lines: p.lines, suggestions: p.suggestions, off_catalog: p.off_catalog, run_id: null, model: null });

type Deps<C extends DraftContract, D extends MockDb> = {
  insert: (db: D, i: NewContract, extra: { draft_proposal_id: string; ai_suggestions: AiSuggestion[] }) => C;
  findContract: (db: D, id: string) => C;
  visible: (db: D, c: C) => boolean;
};

/** Handler AI soạn — `insert` / `findContract` / `visible` do contracts-actions truyền vào (tránh vòng import). */
export function contractDraftHandlers<C extends DraftContract, D extends MockDb>({ insert, findContract, visible }: Deps<C, D>) {
  return {
    'contract.prepare_draft': {
      execute: (db: D, i: { contact_id: string; kind?: Kind; brief: string; request_key: string }) => {
        const prev = [...proposals.values()].find((p) => p.key === i.request_key);
        if (prev) {
          if (prev.contact_id !== i.contact_id || prev.kind !== (i.kind ?? 'service')) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'request_key', fields: { request_key: 'mismatch' } });
          return view(prev);
        }
        if (!db.customers.contacts.some((c) => c.id === i.contact_id)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.contact_id, fields: { contact_id: 'not_found' } });
        const p = propose(db, i);
        proposals.set(p.proposal_id, p);
        return view(p);
      },
    },
    'contract.draft_from_content': {
      execute: (db: D, i: { proposal_id: string }) => {
        const p = proposals.get(i.proposal_id);
        if (!p) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.proposal_id, fields: { proposal_id: 'not_found' } });
        if (p.consumed) {
          const c = findContract(db, p.consumed);
          return { contract_id: c.id, code: c.code, pending_suggestions: (c.ai_suggestions ?? []).filter((s) => s.status === 'pending').length };
        }
        const ai_suggestions: AiSuggestion[] = p.suggestions.map((s) => ({ ...s, status: 'pending', version: 1 }));
        const c = insert(db, { contact_id: p.contact_id, kind: p.kind, title: p.title, value: p.value, start_date: p.start_date, end_date: p.end_date }, { draft_proposal_id: p.proposal_id, ai_suggestions });
        c.events = [{ type: 'created_by_ai', at: c.created_at, actor: 'Trâm' }];
        p.consumed = c.id;
        return { contract_id: c.id, code: c.code, pending_suggestions: ai_suggestions.length };
      },
    },
    'contract.resolve_suggestion': {
      execute: (db: D, i: { contract_id: string; suggestion_id: string; decision: 'keep' | 'discard'; if_version: number }) => {
        const c = findContract(db, i.contract_id);
        if (!visible(db, c)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: c.id });
        if (c.status !== 'draft') throw new ApiRequestError(409, { code: 'INVALID_TRANSITION', message: c.status });
        const s = (c.ai_suggestions ?? []).find((x) => x.id === i.suggestion_id);
        if (!s) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.suggestion_id });
        if (s.version !== i.if_version) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'version', fields: { version: String(s.version) } });
        s.status = i.decision === 'keep' ? 'kept' : 'discarded';
        s.version++;
        return { contract_id: c.id, suggestion_id: s.id, status: s.status, version: s.version, pending: (c.ai_suggestions ?? []).filter((x) => x.status === 'pending').length };
      },
    },
  };
}

/** Cổng trình duyệt (server: `assertResolved`) — còn gợi ý chờ Giữ / Bỏ → 422. */
export function assertResolved(c: DraftContract) {
  const n = (c.ai_suggestions ?? []).filter((s) => s.status === 'pending').length;
  if (n) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: String(n), fields: { ai_suggestions: 'unresolved' } });
}
