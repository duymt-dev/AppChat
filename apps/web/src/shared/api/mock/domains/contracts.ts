// Mock Hợp đồng (Blueprint §4.4 contracts; COMMERCE-DECISIONS §9 — D25): GET /contracts?status=&owner_id=&value=&q=, /contracts/meta, /contracts/:id.
// Dữ liệu = prototype L7795 (fixture sinh bởi tools/scripts/fixtures/gen-contracts.py). Ghi: contracts-actions.ts · trang ký công khai:
// contracts-sign.ts. Hợp đồng từ tệp (TIP-030b): guard giả theo tên (mock không có bytes; tên chứa "virus" / "macro" → từ chối như
// guard server), GET /contracts/:id/files + tải tệp (HTML minh hoạ).
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
  /** Nguồn nội dung ký (TIP-030b). */
  source?: 'template' | 'file';
  source_file_id?: string | null;
  source_hash?: string | null;
  source_version?: number;
  origin_message_id?: string | null;
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

/** Tệp đã "tải lên" ở mock (transport.upload chỉ trả id) — tên giữ theo id để guard giả + danh sách tệp. */
export const mockUploads = new Map<string, { name: string; size: number }>();

export const bad = (fields: Record<string, string>) => new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: Object.keys(fields)[0]!, fields });

/** Guard giả theo tên tệp (server kiểm bytes thật). */
export function mockGuard(fileId: string) {
  const f = mockUploads.get(fileId);
  if (!f) throw bad({ file_id: 'not_found' });
  const ext = /\.(pdf|docx)$/i.exec(f.name)?.[1]?.toLowerCase();
  if (!ext || /virus|\.exe/i.test(f.name)) throw bad({ file: 'unsupported_type' });
  if (/macro/i.test(f.name)) throw bad({ file: 'macro' });
  return { ...f, type: ext as 'pdf' | 'docx', sha256: `mock${fileId.replace(/\W/g, '').padEnd(60, '0')}`.slice(0, 64) };
}

export const fileSource = (fileId: string) => {
  const g = mockGuard(fileId);
  return { source: 'file' as const, source_file_id: fileId, source_hash: g.sha256, file_name: g.name };
};

const extOf = (n: string) => (/\.([a-z0-9]{2,5})$/i.exec(n)?.[1] ?? 'pdf').toLowerCase();

export const contractFilesParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/contracts\/(ctr_[^/]+)\/files$/);
  if (!m) return undefined;
  return (db) => {
    const c = findContract(db, m[1]!);
    if (!visible(db, c)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: c.id });
    const out = [];
    if (c.source_file_id) {
      const f = mockUploads.get(c.source_file_id);
      out.push({ id: c.source_file_id, role: 'source', name: f?.name ?? c.file_name, mime: extOf(c.file_name) === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ext: extOf(f?.name ?? c.file_name), size: f?.size ?? 0, sha256: c.source_hash ?? '', at: MOCK_NOW, by: 'Trâm' });
    }
    if (c.signed_sha256) out.push({ id: `signed_${c.id}`, role: 'signed', name: `${c.code} - đã ký.pdf`, mime: 'application/pdf', ext: 'pdf', size: 327_680, sha256: c.signed_sha256, at: c.signed_by_customer_at ?? MOCK_NOW, by: '' });
    return out;
  };
};

/** Tải tệp của hợp đồng ở mock: trang HTML minh hoạ (không có bytes thật). */
export function contractFileBlob(db: MockDb, path: string): string | null {
  const m = path.match(/^\/contracts\/(ctr_[^/]+)\/files\/([^/]+)$/);
  if (!m) return null;
  const c = db.contracts.contracts.find((x) => x.id === m[1] && !x.deleted) as Contract | undefined;
  if (!c || (c.source_file_id !== m[2] && `signed_${c.id}` !== m[2])) return null;
  return `<!doctype html><meta charset="utf-8"><title>${c.code}</title><h1>${c.code}</h1><p>${c.file_name}</p>`;
}
