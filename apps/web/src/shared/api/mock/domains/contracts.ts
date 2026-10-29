// Mock Hợp đồng (Blueprint §4.4 contracts; COMMERCE-DECISIONS §9 — D25): GET /contracts?status=&owner_id=&value=&q=, /contracts/meta, /contracts/:id.
// Dữ liệu = prototype L7795 (fixture sinh bởi tools/scripts/fixtures/gen-contracts.py). Trang ký công khai: contracts-sign.ts.
import { ApiRequestError, ROLE_DEFS, type ErrorCode } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/contracts.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW, enrich as enrichQuote } from './quotes';

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

const DAY = 86_400_000;
export const SIGN_LINK_DAYS = 7;
/** Chip / cột kanban (COMMERCE §9): "Chờ duyệt" gộp vào Nháp (kèm badge). */
export const chipOf = (s: ContractStatus) =>
  s === 'pending_approval' ? 'draft' : s === 'pending_signature' ? 'pending' : s;

const visible = (db: MockDb, c: Contract) => {
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
const need = (c: Contract, ...st: ContractStatus[]) => {
  if (!st.includes(c.status)) deny('INVALID_STATE', `${c.code}: ${c.status}`);
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
        (!p.value || p.value === 'all' || (VALUE[String(p.value)]?.(Number(c.value)) ?? true)) &&
        (!s || [c.code, c.contact_name, c.title].some((v) => v.toLowerCase().includes(s))),
    );
    return { data: rows, next_cursor: null };
  },
  '/contracts/meta': (db) => {
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
      crm: fixture.crm,
      insight: fixture.insight,
      suggestions: fixture.suggestions,
      files: fixture.files,
      ai_runs: fixture.ai_runs,
    };
  },
};

export const contractsParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/contracts\/(ctr_[^/]+)$/);
  if (!m) return undefined;
  return (db) => findContract(db, m[1]!);
};

type Fields = Partial<
  Pick<
    Contract,
    | 'contact_id'
    | 'quote_id'
    | 'number'
    | 'kind'
    | 'title'
    | 'value'
    | 'signed_date'
    | 'start_date'
    | 'end_date'
    | 'owner_user_id'
    | 'file_name'
    | 'note'
  >
>;

const NAMES: Record<string, string> = { u_tram: 'Trâm', u_minh: 'Minh', u_huong: 'Hương', u_khoa: 'Khoa' };

const insert = (db: MockDb, i: Fields & { contact_id: string }, extra: Partial<Contract> = {}) => {
  const n = ++db.contracts.seq;
  const contact = db.customers.contacts.find((c) => c.id === i.contact_id);
  const owner = i.owner_user_id ?? ME;
  const c: Contract = {
    id: `ctr_${n}`,
    code: `HĐ-${n}`,
    number: i.number ?? '',
    kind: i.kind ?? 'service',
    contact_id: i.contact_id,
    contact_name: contact?.full_name ?? i.contact_id,
    phone: contact?.phone ?? '',
    quote_id: i.quote_id ?? null,
    quote_code: '',
    title: i.title ?? '',
    value: i.value ?? '0',
    signed_date: i.signed_date ?? MOCK_NOW.slice(0, 10),
    start_date: i.start_date ?? null,
    end_date: i.end_date ?? null,
    owner_user_id: owner,
    owner_name: NAMES[owner] ?? owner,
    status: 'draft',
    created_at: MOCK_NOW,
    sent_at: null,
    signed_by_customer_at: null,
    sign_token: null,
    sign_link_expires_at: null,
    otp_fails: 0,
    signed_sha256: null,
    renewal_of_id: null,
    terminated_reason: '',
    note: i.note ?? '',
    file_name: i.file_name ?? '',
    events: [{ type: 'created', at: MOCK_NOW, actor: NAMES[ME]! }],
    ai: { hint: '', wait: false },
    ...extra,
  };
  db.contracts.contracts.unshift(c);
  return c;
};

const setStatus = (to: ContractStatus, from: ContractStatus[], event: string) => ({
  execute: (db: MockDb, i: { contract_id: string }) => {
    const c = findContract(db, i.contract_id);
    need(c, ...from);
    c.status = to;
    logEvent(c, event, NAMES[ME]!);
    return { contract_id: c.id, status: to };
  },
});

const shift = (db: MockDb) => {
  db.contracts.contracts.shift();
  db.contracts.seq--;
};

export const contractsHandlers: Record<string, MockHandler> = {
  'contract.create': {
    execute: (db, i: Fields & { contact_id: string }) => {
      const c = insert(db, i);
      return { contract_id: c.id, code: c.code };
    },
    undo: shift,
  },
  'contract.create_from_quote': {
    execute: (db, i: { quote_id: string }) => {
      const q = db.quotes.quotes.find((x) => x.id === i.quote_id && !x.deleted);
      if (!q) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.quote_id });
      if (q.status !== 'accepted') deny('INVALID_STATE', `${q.code}: ${q.status}`);
      const total = enrichQuote(q).total;
      const c = insert(
        db,
        {
          contact_id: q.contact_id,
          quote_id: q.id,
          owner_user_id: q.owner_user_id,
          title: q.items.map((x) => x.name).join(', '),
          value: total,
        },
        { contact_name: q.contact_name, phone: q.phone, quote_code: q.code },
      );
      c.events = [{ type: 'created_from_quote', at: MOCK_NOW, actor: q.owner_name }];
      q.converted = { kind: 'contract', id: c.id };
      return { contract_id: c.id, code: c.code };
    },
    undo: (db, i: { quote_id: string }) => {
      shift(db);
      const q = db.quotes.quotes.find((x) => x.id === i.quote_id);
      if (q) q.converted = null;
    },
  },
  'contract.update': {
    execute: (db, i: { contract_id: string; patch: Fields }) => {
      const c = findContract(db, i.contract_id);
      need(c, 'draft', 'pending_approval');
      Object.assign(c, i.patch);
      // Sửa khi đang chờ duyệt thì quay lại nháp (phải trình lại).
      c.status = 'draft';
      return { contract_id: c.id };
    },
  },
  'contract.submit': setStatus('pending_approval', ['draft'], 'submitted'),
  'contract.request_changes': setStatus('draft', ['pending_approval'], 'changes_requested'),
  'contract.reject_internal': setStatus('draft', ['pending_approval'], 'rejected_internal'),
  'contract.approve_and_sign': {
    execute: (db, i: { contract_id: string; otp: string; signature_png: string }) => {
      const c = findContract(db, i.contract_id);
      need(c, 'pending_approval', 'draft');
      // Mock OTP email: mọi mã 6 số trừ 000000 là đúng.
      if (i.otp === '000000') deny('OTP_INVALID', c.code);
      c.status = 'pending_signature';
      c.business_signature = i.signature_png;
      logEvent(c, 'approved_signed', 'Chủ sở hữu');
      return { contract_id: c.id, status: c.status };
    },
  },
  'contract.send_for_signature': {
    execute: (db, i: { contract_id: string; channel: string }) => {
      const c = findContract(db, i.contract_id);
      need(c, 'pending_signature');
      c.sign_token = c.sign_token ?? `tk_${c.id.slice(4)}_${db.contracts.seq}`;
      c.sign_link_expires_at = new Date(new Date(MOCK_NOW).getTime() + SIGN_LINK_DAYS * DAY).toISOString();
      c.sent_at = MOCK_NOW;
      c.otp_fails = 0;
      logEvent(c, 'sent', NAMES[ME]!, { ip: i.channel });
      return { contract_id: c.id, sign_url: `/sign/${c.sign_token}`, expires_at: c.sign_link_expires_at };
    },
  },
  'contract.remind_signer': {
    execute: (db, i: { contract_id: string }) => {
      const c = findContract(db, i.contract_id);
      need(c, 'pending_signature');
      logEvent(c, 'reminded', NAMES[ME]!);
      return { contract_id: c.id };
    },
  },
  'contract.extend_sign_link': {
    execute: (db, i: { contract_id: string; days?: number }) => {
      const c = findContract(db, i.contract_id);
      need(c, 'pending_signature', 'declined');
      const base = Math.max(
        new Date(c.sign_link_expires_at ?? MOCK_NOW).getTime(),
        new Date(MOCK_NOW).getTime(),
      );
      c.sign_link_expires_at = new Date(base + (i.days ?? SIGN_LINK_DAYS) * DAY).toISOString();
      c.status = 'pending_signature';
      logEvent(c, 'link_extended', NAMES[ME]!);
      return { contract_id: c.id, expires_at: c.sign_link_expires_at };
    },
  },
  'contract.terminate': {
    execute: (db, i: { contract_id: string; reason: string }) => {
      const c = findContract(db, i.contract_id);
      need(c, 'signed');
      c.status = 'terminated';
      c.terminated_reason = i.reason;
      logEvent(c, 'terminated', 'Chủ sở hữu');
      return { contract_id: c.id, status: c.status };
    },
  },
  'contract.renew': {
    execute: (db, i: { contract_id: string }) => {
      const old = findContract(db, i.contract_id);
      need(old, 'signed', 'expired');
      const c = insert(
        db,
        { ...old, quote_id: null, start_date: old.end_date, end_date: null },
        { contact_name: old.contact_name, phone: old.phone, renewal_of_id: old.id },
      );
      return { contract_id: c.id, code: c.code };
    },
    undo: shift,
  },
  'contract.delete': {
    execute: (db, i: { contract_id: string }) => {
      const c = findContract(db, i.contract_id);
      need(c, 'draft');
      c.deleted = true;
      return { contract_id: c.id };
    },
    undo: (db, i: { contract_id: string }) => {
      const c = db.contracts.contracts.find((x) => x.id === i.contract_id);
      if (c) c.deleted = false;
    },
  },
};
