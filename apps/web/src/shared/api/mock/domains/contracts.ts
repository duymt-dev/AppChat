// Mock Hợp đồng (Blueprint §4.4 contracts; COMMERCE-DECISIONS §9 — D25): GET /contracts?status=&owner_id=&value=&q=, /contracts/meta, /contracts/:id.
// Dữ liệu = prototype L7795 (fixture sinh bởi tools/scripts/fixtures/gen-contracts.py). Ghi: contracts-actions.ts · trang ký công khai:
// contracts-sign.ts.
import { ApiRequestError, ROLE_DEFS, htmlPage, type ErrorCode } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/contracts.json';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';
import { paginate } from '../paginate';

type Fixed = (typeof fixture.contracts)[number];
export type ContractStatus =
  'draft' | 'pending_approval' | 'pending_signature' | 'signed' | 'declined' | 'expired' | 'terminated';
export interface SignEvent {
  type: string;
  at: string;
  actor: string;
  ip?: string;
  doc_sha256?: string;
}
export type Contract = Omit<
  Fixed,
  | 'status'
  | 'events'
  | 'quote_id'
  | 'start_date'
  | 'end_date'
  | 'sent_at'
  | 'signed_by_customer_at'
  | 'sign_token'
  | 'sign_link_expires_at'
  | 'signed_sha256'
  | 'renewal_of_id'
> & {
  status: ContractStatus;
  events: SignEvent[];
  quote_id: string | null;
  start_date: string | null;
  end_date: string | null;
  sent_at: string | null;
  signed_by_customer_at: string | null;
  sign_token: string | null;
  sign_link_expires_at: string | null;
  signed_sha256: string | null;
  renewal_of_id: string | null;
  business_signature?: string | null;
  customer_signature?: string | null;
  deleted?: boolean;
};

export interface ContractsState {
  contracts: Contract[];
  seq: number;
}

export const createContractsState = (): ContractsState => ({
  contracts: structuredClone(fixture.contracts) as Contract[],
  seq: 1182,
});

/** Chip / cột kanban (COMMERCE §9): "Chờ duyệt" gộp vào Nháp (kèm badge). */
export const chipOf = (s: ContractStatus) =>
  s === 'pending_approval' ? 'draft' : s === 'pending_signature' ? 'pending' : s;

export const visible = (db: MockDb, c: Contract) => {
  if (c.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.sales;
  return scope === 'all' || (scope === 'own' && c.owner_user_id === ME);
};

export const findContract = (db: MockDb, id: string) => {
  const c = db.contracts.contracts.find((x) => x.id === id && !x.deleted);
  if (!c) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return c;
};
export const deny = (code: ErrorCode, message: string): never => {
  throw new ApiRequestError(409, { code, message });
};
export const logEvent = (c: Contract, type: string, actor: string, extra: Partial<SignEvent> = {}) =>
  c.events.push({ type, at: MOCK_NOW, actor, ...extra });

const VALUE: Record<string, (v: number) => boolean> = {
  lt10: (v) => v < 10_000_000,
  '10to30': (v) => v >= 10_000_000 && v <= 30_000_000,
  gt30: (v) => v > 30_000_000,
};

export const contractsRoutes: Record<string, MockRoute> = {
  '/contracts': (db, p) => {
    const s = String(p.q ?? '')
      .trim()
      .toLowerCase();
    const rows = db.contracts.contracts.filter(
      (c) =>
        visible(db, c) &&
        (!p.status || p.status === 'all' || chipOf(c.status) === p.status) &&
        (!p.owner_id || p.owner_id === 'all' || c.owner_user_id === p.owner_id) &&
        (!p.contact_id || c.contact_id === p.contact_id) &&
        (!p.value || p.value === 'all' || (VALUE[String(p.value)]?.(Number(c.value)) ?? true)) &&
        (!s || [c.code, c.contact_name, c.title].some((v) => v.toLowerCase().includes(s))),
    );
    return paginate(rows, p);
  },
  '/contracts/meta': (db, p) => {
    const all = db.contracts.contracts.filter((c) => visible(db, c));
    const counts: Record<string, number> = { all: all.length };
    for (const c of all) counts[chipOf(c.status)] = (counts[chipOf(c.status)] ?? 0) + 1;
    const active = all.filter((c) => c.status === 'signed').reduce((a, c) => a + Number(c.value), 0);
    return {
      counts,
      stats: {
        total: all.length,
        signed: counts.signed ?? 0,
        pending: counts.pending ?? 0,
        active_value: String(active),
      },
      // Thẻ CRM / nhận định / tệp theo hợp đồng (`?contract_id=`); không có thì để trống như server.
      ...(p.contract_id
        ? { crm: fixture.crm, insight: fixture.insight, suggestions: fixture.suggestions, files: fixture.files }
        : { crm: { ltv: '0', total: 0, tier: '', debt: '0', others: [] }, insight: '', suggestions: [], files: [] }),
      ai_runs: fixture.ai_runs,
    };
  },
};

export const contractsParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/contracts\/(ctr_[^/]+)$/);
  if (!m) return undefined;
  return (db) => {
    const c = findContract(db, m[1]!);
    if (!visible(db, c)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: c.id });
    return c;
  };
};

/** Mock "Tải PDF" hợp đồng (không LibreOffice): trang HTML tối giản — server trả PDF đóng băng / đã ký. */
export function contractPdf(db: MockDb, path: string): string | null {
  const m = path.match(/^\/contracts\/(ctr_[^/]+)\/pdf$/) ?? path.match(/^\/public\/sign\/([^/]+)\/pdf$/);
  if (!m) return null;
  const c = db.contracts.contracts.find((x) => (x.id === m[1] || x.sign_token === m[1]) && !x.deleted);
  return c ? htmlPage(c.code, `<h1>${c.code}</h1><p>${c.title}</p><p>${c.contact_name} · ${c.value}</p>`) : null;
}
