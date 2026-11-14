// Mock trang ký công khai (Blueprint §4.4 public; COMMERCE §9 C1): GET /public/sign/:token · POST …/otp · …/sign · …/decline.
// Link một lần, hết hạn 7 ngày; OTP 6 số, sai 5 lần thì khoá link; ký xong chèn trang chứng nhận + SHA-256, khoá nội dung.
import { ApiRequestError } from '@appchat/shared';
import type { MockPost } from '../auth-routes';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { MOCK_NOW } from './quotes';
import { logEvent, type Contract } from './contracts';

export const OTP_MAX_FAILS = 5;
/** OTP mock gửi tới khách — hiển thị trong dev, backend thật gửi qua Zalo đang chat / email. */
export const MOCK_SIGN_OTP = '246810';
const PUBLIC_IP = '113.161.0.24';

const byToken = (db: MockDb, token: string) => {
  const c = db.contracts.contracts.find((x) => x.sign_token === token && !x.deleted);
  if (!c) throw invalid(token);
  return c;
};
/** Như server: link giả / đã thay / hết hạn / bị khoá → 410 SIGN_LINK_INVALID. */
const invalid = (m: string) => new ApiRequestError(410, { code: 'SIGN_LINK_INVALID', message: m });
const live = (c: Contract) => {
  const expired = !c.sign_link_expires_at || new Date(c.sign_link_expires_at) < new Date(MOCK_NOW);
  if (c.status !== 'pending_signature' || expired || c.otp_fails >= OTP_MAX_FAILS)
    throw invalid(c.code);
};

/** Băm giả lập 64 hex (mock — backend tính SHA-256 trên file PDF cuối). */
export const mockSha256 = (s: string) => {
  let out = '';
  for (let k = 0; k < 8; k++) {
    let h = 0x811c9dc5 ^ k;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
    out += h.toString(16).padStart(8, '0');
  }
  return out;
};

const view = (c: Contract) => ({
  code: c.code,
  title: c.title,
  kind: c.kind,
  value: c.value,
  start_date: c.start_date,
  end_date: c.end_date,
  customer: { name: c.contact_name, phone: c.phone },
  business: { name: 'Spa Thảo Mộc An Nhiên', signed: !!c.business_signature || c.status !== 'draft' },
  status: c.status,
  expires_at: c.sign_link_expires_at,
  signed_at: c.signed_by_customer_at,
  sha256: c.signed_sha256,
  otp_left: Math.max(0, OTP_MAX_FAILS - c.otp_fails),
  certificate:
    c.status === 'signed'
      ? c.events.filter((e) => ['sent', 'opened', 'otp_sent', 'otp_ok', 'signed'].includes(e.type))
      : [],
});

export const signParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/public\/sign\/([^/]+)$/);
  if (!m) return undefined;
  return (db) => view(byToken(db, m[1]!));
};

export const signParamPost = (path: string): MockPost | undefined => {
  const m = path.match(/^\/public\/sign\/([^/]+)\/(open|otp|sign|decline)$/);
  if (!m) return undefined;
  const [, token, op] = m as unknown as [string, string, string];
  return (db, body) => {
    const c = byToken(db, token);
    // Như server (TIP-030c): mọi POST mang request_id UUID; cùng request_id + cùng thao tác → kết quả cũ (không ghi lần hai).
    const rid = typeof body.request_id === 'string' && UUID.test(body.request_id) ? body.request_id : null;
    if (!rid && op !== 'sign') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'request_id' });
    const key = `${token}|${op}|${rid}`;
    if (rid && seen.has(key)) return seen.get(key);
    const out = apply(db, c, op, body);
    if (rid) seen.set(key, out);
    return out;
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const seen = new Map<string, unknown>();

function apply(_db: MockDb, c: Contract, op: string, body: Record<string, unknown>) {
  {
    if (op === 'open') {
      const expired = !c.sign_link_expires_at || new Date(c.sign_link_expires_at) < new Date(MOCK_NOW);
      if (c.status === 'pending_signature' && expired) throw invalid(c.code);
      if (c.status === 'pending_signature') logEvent(c, 'opened', c.contact_name, { ip: PUBLIC_IP });
      return view(c);
    }
    live(c);
    if (op === 'otp') {
      logEvent(c, 'otp_sent', 'system', { ip: PUBLIC_IP });
      return { channel: 'zalo_personal', sent_to: c.phone.replace(/\d(?=\d{3})/g, '•') };
    }
    if (op === 'decline') {
      c.status = 'declined';
      // Lý do từ chối như server (`declined_reason`) — mock ghi vào ghi chú hợp đồng.
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
      if (reason) c.note = reason;
      logEvent(c, 'declined', c.contact_name, { ip: PUBLIC_IP });
      return view(c);
    }
    if (body.consent !== true || typeof body.signature_png !== 'string' || !body.signature_png)
      throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'consent / signature' });
    if (body.otp !== MOCK_SIGN_OTP) {
      c.otp_fails += 1;
      logEvent(c, 'otp_fail', c.contact_name, { ip: PUBLIC_IP });
      if (c.otp_fails >= OTP_MAX_FAILS) throw invalid(c.code);
      throw new ApiRequestError(422, { code: 'OTP_INVALID', message: String(OTP_MAX_FAILS - c.otp_fails) });
    }
    logEvent(c, 'otp_ok', c.contact_name, { ip: PUBLIC_IP });
    c.customer_signature = body.signature_png;
    c.status = 'signed';
    c.signed_by_customer_at = MOCK_NOW;
    c.signed_sha256 = mockSha256(`${c.code}|${c.value}|${c.contact_name}|${MOCK_NOW}`);
    logEvent(c, 'signed', c.contact_name, { ip: PUBLIC_IP, doc_sha256: c.signed_sha256 });
    return view(c);
  }
}
