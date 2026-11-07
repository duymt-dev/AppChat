// Mock phụ lục hợp đồng (TIP-030b F3) — cùng hợp đồng http: chỉ hợp đồng đã ký; PL-n; cùng request_key → cùng phụ lục; APPENDIX_FLOW
// (Owner ký trước bằng OTP riêng MOCK_APPENDIX_OWNER_OTP, gửi link khách, khách ký MOCK_APPENDIX_OTP); sửa nháp → version +1, link cũ hết
// hiệu lực. GET /contracts/:id/appendices · trang công khai /public/appendix-sign/:token/*. Không import `../store` / `./contracts`
// (vòng import mock — depcheck): tra hợp đồng do contracts-actions truyền vào.
import { APPENDIX_FLOW, ApiRequestError, assertTransition, type AppError } from '@appchat/shared';

export const MOCK_APPENDIX_OWNER_OTP = '975310';
export const MOCK_APPENDIX_OTP = '864200';
const NOW = '2026-11-04T09:00:00.000Z';
const IP = '113.161.0.24';

type Status = 'draft' | 'pending_approval' | 'pending_signature' | 'signed' | 'declined' | 'expired' | 'terminated';
interface Ev {
  type: string;
  at: string;
  actor: string;
  party: string | null;
  version: number;
  doc_sha256: string | null;
}
interface Row {
  id: string;
  contract_id: string;
  code: string;
  seq: number;
  title: string;
  content: string | null;
  status: Status;
  version: number;
  value_delta: string | null;
  note: string;
  request_key: string;
  owner_otp: boolean;
  token: string | null;
  token_version: number;
  sent_channel: string | null;
  signed_by_business_at: string | null;
  signed_by_customer_at: string | null;
  file_sha256: string | null;
  signed_sha256: string | null;
  declined_reason: string;
  otp_fails: number;
  created_at: string;
  events: Ev[];
}
/** Phần hợp đồng mock luồng phụ lục đọc. */
interface Parent {
  id: string;
  code: string;
  title: string;
  status: string;
  contact_name: string;
}
type Deps<D, C extends Parent> = { find: (db: D, id: string) => C; visible: (db: D, c: C) => boolean; isOwner: (db: D) => boolean };

const rows = new Map<string, Row>();
/** Token phụ lục mẫu (HĐ-1180/PL-1 chờ khách ký) — trang ký công khai mở được sau khi tải lại trang (state mock nằm trong bộ nhớ). */
export const MOCK_APPENDIX_TOKEN = 'apx_1180_demo';
const blank = { note: '', owner_otp: false, sent_channel: null, signed_by_customer_at: null, signed_sha256: null, declined_reason: '', otp_fails: 0, created_at: NOW };
/** Test: về dữ liệu mẫu. */
export const resetAppendixMock = () => rows.clear();
const seed = () => {
  if (rows.size) return;
  const a: Row = { ...blank, id: 'apx_1', contract_id: 'ctr_1180', code: 'HĐ-1180/PL-1', seq: 1, title: 'Bổ sung 2 buổi chăm sóc da', content: 'Bổ sung 2 buổi chăm sóc da chuyên sâu, thực hiện trong thời hạn hợp đồng.', status: 'pending_signature', version: 1, value_delta: '1200000', request_key: 'seed', token: MOCK_APPENDIX_TOKEN, token_version: 1, sent_channel: 'zalo_personal', signed_by_business_at: NOW, file_sha256: null, events: [] };
  a.file_sha256 = sha(`${a.code}|1|${a.content}`);
  rows.set(a.id, a);
  for (const t of ['created', 'submitted', 'approved_signed', 'sent']) log(a, t, 'Trâm', t === 'sent' ? 'customer' : t === 'approved_signed' ? 'business' : null);
};
const sha = (s: string) => Array.from({ length: 8 }, (_, k) => [...s].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0, 0x811c9dc5 ^ k).toString(16).padStart(8, '0')).join('');
const log = (a: Row, type: string, actor: string, party: string | null = null, doc: string | null = null) => a.events.push({ type, at: NOW, actor, party, version: a.version, doc_sha256: doc });
const bad = (status: number, code: string, message: string, fields?: Record<string, string>) => new ApiRequestError(status, { code: code as never, message, ...(fields ? { fields } : {}) });
const step = (a: Row, action: string) => {
  try {
    return assertTransition(APPENDIX_FLOW, a.status, action);
  } catch (e) {
    throw bad(409, 'INVALID_TRANSITION', a.status, { status: (e as AppError).fields?.status ?? a.status });
  }
};
const view = (a: Row) => {
  const { request_key: _k, owner_otp: _o, token: _t, token_version: _v, otp_fails: _f, ...rest } = a;
  return { ...rest, source: 'template' as const, source_name: null, sign_link_expires_at: a.token ? '2026-11-11T16:59:59.000Z' : null, pdf: !!(a.signed_sha256 ?? a.file_sha256) };
};

export function contractAppendixMock<D, C extends Parent>({ find, visible, isOwner }: Deps<D, C>) {
  const parentOf = (db: D, id: string) => {
    seed();
    const c = find(db, id);
    if (!visible(db, c)) throw bad(404, 'NOT_FOUND', id);
    return c;
  };
  const mine = (db: D, id: string) => {
    const a = rows.get(id);
    if (!a) throw bad(404, 'NOT_FOUND', id, { appendix_id: 'not_found' });
    parentOf(db, a.contract_id);
    return a;
  };
  const sign = (db: D) => {
    if (!isOwner(db)) throw bad(403, 'FORBIDDEN', 'contract.sign', { permission: 'contract.sign' });
  };
  const byToken = (token: string) => {
    seed();
    const a = [...rows.values()].find((x) => x.token === token);
    if (!a || a.token_version !== a.version) throw bad(410, 'SIGN_LINK_INVALID', token);
    return a;
  };
  const signView = (db: D, a: Row) => {
    const c = find(db, a.contract_id);
    return {
      code: a.code,
      title: a.title,
      contract: { code: c.code, title: c.title },
      content: a.content,
      value_delta: a.value_delta,
      version: a.version,
      customer: { name: c.contact_name, phone: '•••••••456' },
      business: { name: 'Spa Thảo Mộc An Nhiên', signed: !!a.signed_by_business_at },
      status: a.status,
      expires_at: '2026-11-11T16:59:59.000Z',
      signed_at: a.signed_by_customer_at,
      sha256: a.signed_sha256,
      otp_left: Math.max(0, 5 - a.otp_fails),
      certificate: a.status === 'signed' ? a.events.filter((e) => e.version === a.version).map((e) => ({ type: e.type, at: e.at, actor: e.actor, ip: IP })) : [],
      pdf: true,
    };
  };

  const handlers = {
    'contract.create_appendix': {
      execute: (db: D, i: { contract_id: string; title: string; content?: string; value_delta?: string; request_key: string }) => {
        const c = parentOf(db, i.contract_id);
        const prev = [...rows.values()].find((x) => x.contract_id === c.id && x.request_key === i.request_key);
        if (prev) return { contract_id: c.id, appendix_id: prev.id, code: prev.code };
        if (c.status !== 'signed') throw bad(409, 'INVALID_STATE', c.status, { contract: c.status });
        const seq = [...rows.values()].filter((x) => x.contract_id === c.id).length + 1;
        const a: Row = { ...blank, id: `apx_${rows.size + 1}`, contract_id: c.id, code: `${c.code}/PL-${seq}`, seq, title: i.title, content: i.content ?? null, status: 'draft', version: 1, value_delta: i.value_delta ?? null, request_key: i.request_key, token: null, token_version: 0, signed_by_business_at: null, file_sha256: null, events: [] };
        rows.set(a.id, a);
        log(a, 'created', 'Trâm');
        return { contract_id: c.id, appendix_id: a.id, code: a.code };
      },
    },
    'contract.appendix_update': {
      execute: (db: D, i: { appendix_id: string; if_version: number; patch: { title?: string; content?: string; value_delta?: string | null } }) => {
        const a = mine(db, i.appendix_id);
        step(a, 'contract.appendix_update');
        if (a.version !== i.if_version) throw bad(409, 'CONFLICT', 'version', { version: String(a.version) });
        Object.assign(a, { ...(i.patch.title !== undefined ? { title: i.patch.title } : {}), ...(i.patch.content !== undefined ? { content: i.patch.content } : {}), ...(i.patch.value_delta !== undefined ? { value_delta: i.patch.value_delta } : {}) });
        a.version++;
        a.owner_otp = false;
        log(a, 'updated', 'Trâm');
        return { appendix_id: a.id, status: a.status, version: a.version };
      },
    },
    'contract.appendix_submit': {
      execute: (db: D, i: { appendix_id: string }) => {
        const a = mine(db, i.appendix_id);
        a.status = step(a, 'contract.appendix_submit');
        log(a, 'submitted', 'Trâm');
        return { appendix_id: a.id, status: a.status, version: a.version };
      },
    },
    'contract.appendix_request_changes': {
      execute: (db: D, i: { appendix_id: string; reason?: string }) => {
        const a = mine(db, i.appendix_id);
        a.status = step(a, 'contract.appendix_request_changes');
        log(a, 'changes_requested', 'Trâm');
        return { appendix_id: a.id, status: a.status, version: a.version };
      },
    },
    'contract.appendix_owner_otp': {
      execute: (db: D, i: { appendix_id: string }) => {
        sign(db);
        const a = mine(db, i.appendix_id);
        if (a.status !== 'pending_approval') throw bad(409, 'INVALID_TRANSITION', a.status, { status: a.status });
        a.owner_otp = true;
        log(a, 'otp_sent', 'Trâm', 'business');
        return { appendix_id: a.id, sent_to: 'ow•••@annhien.vn' };
      },
    },
    'contract.appendix_approve_and_sign': {
      execute: (db: D, i: { appendix_id: string; if_version: number; otp: string; signature_png: string }) => {
        sign(db);
        const a = mine(db, i.appendix_id);
        const to = step(a, 'contract.appendix_approve_and_sign');
        if (a.version !== i.if_version) throw bad(409, 'CONFLICT', 'version', { version: String(a.version) });
        if (!a.owner_otp || i.otp !== MOCK_APPENDIX_OWNER_OTP) throw bad(422, 'OTP_INVALID', '4', { otp: 'invalid' });
        a.owner_otp = false;
        a.status = to;
        a.signed_by_business_at = NOW;
        a.file_sha256 = sha(`${a.code}|${a.version}|${a.content}`);
        log(a, 'approved_signed', 'Trâm', 'business', a.file_sha256);
        return { appendix_id: a.id, status: a.status, version: a.version };
      },
    },
    'contract.appendix_send': {
      execute: (db: D, i: { appendix_id: string; channel: string }) => {
        sign(db);
        const a = mine(db, i.appendix_id);
        step(a, 'contract.appendix_send');
        a.token = `apx-${a.id}-${a.events.length}`;
        a.token_version = a.version;
        a.sent_channel = i.channel;
        log(a, 'sent', 'Trâm', 'customer', a.file_sha256);
        return { appendix_id: a.id, sign_url: `/sign/appendix/${a.token}`, expires_at: '2026-11-11T16:59:59.000Z' };
      },
    },
  };

  const list = (db: D, contractId: string) => {
    parentOf(db, contractId);
    return [...rows.values()].filter((a) => a.contract_id === contractId).reverse().map(view);
  };

  const pub = (db: D, token: string, op: string, body: Record<string, unknown>) => {
    const a = byToken(token);
    if (op === 'open' || op === 'view') {
      if (a.status === 'pending_signature' && op === 'open') log(a, 'opened', find(db, a.contract_id).contact_name, 'customer');
      return signView(db, a);
    }
    if (a.status !== 'pending_signature' || a.otp_fails >= 5) throw bad(410, 'SIGN_LINK_INVALID', token);
    const who = find(db, a.contract_id).contact_name;
    if (op === 'otp') {
      log(a, 'otp_sent', 'system', 'customer');
      return { channel: a.sent_channel ?? 'zalo_personal', sent_to: '•••••••456' };
    }
    if (op === 'decline') {
      a.status = 'declined';
      a.declined_reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : '';
      log(a, 'declined', who, 'customer');
      return signView(db, a);
    }
    if (body.consent !== true || typeof body.signature_png !== 'string' || !body.signature_png) throw bad(422, 'VALIDATION_FAILED', 'consent / signature');
    if (body.otp !== MOCK_APPENDIX_OTP) {
      a.otp_fails++;
      log(a, 'otp_fail', who, 'customer');
      if (a.otp_fails >= 5) throw bad(410, 'SIGN_LINK_INVALID', token);
      throw bad(422, 'OTP_INVALID', String(5 - a.otp_fails));
    }
    log(a, 'otp_ok', who, 'customer');
    a.status = 'signed';
    a.signed_by_customer_at = NOW;
    a.signed_sha256 = sha(`${a.code}|signed|${a.file_sha256}`);
    a.token = null;
    log(a, 'signed', who, 'customer', a.signed_sha256);
    return signView(db, a);
  };

  return {
    handlers,
    /** GET /contracts/:id/appendices · /public/appendix-sign/:token. */
    route: (path: string): ((db: D) => unknown) | undefined => {
      const l = path.match(/^\/contracts\/(ctr_[^/]+)\/appendices$/);
      if (l) return (db) => list(db, l[1]!);
      const v = path.match(/^\/public\/appendix-sign\/([^/]+)$/);
      if (v) return (db) => pub(db, v[1]!, 'view', {});
      return undefined;
    },
    /** POST /public/appendix-sign/:token/(open|otp|sign|decline). */
    post: (path: string): ((db: D, body: Record<string, unknown>) => unknown) | undefined => {
      const m = path.match(/^\/public\/appendix-sign\/([^/]+)\/(open|otp|sign|decline)$/);
      return m ? (db, body) => pub(db, m[1]!, m[2]!, body) : undefined;
    },
  };
}
