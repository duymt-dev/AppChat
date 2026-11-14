// Gọi API Brevo của DN (hợp đồng test/fixtures/brevo/tenant-mail-contract.json): URL cố định, header `api-key` của ĐÚNG kết nối, qua
// MailTransports.http do core tiêm (safeFetch). Không bao giờ ghi thông điệp / body provider vào lỗi — chỉ mã ổn định.
import { ProviderError } from '../../provider-errors';
import { retryAfterSeconds } from '../../provider-http';
import type { MailTransports, SendOutcome, SenderCapability, TenantMailMessage } from '../../ports/tenant-mail';

export const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
export const BREVO_SENDERS_URL = 'https://api.brevo.com/v3/senders';

const json = (body: string): unknown => {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

/** GET /v3/senders → người gửi; `active` = Brevo đã kích hoạt (sau xác minh) → sender_verified, ngược lại unverified. */
export async function brevoSenders(t: MailTransports, apiKey: string): Promise<SenderCapability[]> {
  const r = await t.http({ method: 'GET', url: BREVO_SENDERS_URL, headers: { 'api-key': apiKey, accept: 'application/json' } });
  if (r.status === 401 || r.status === 403) throw new ProviderError('auth_failed');
  if (r.status === 429) throw new ProviderError('rate_limited', undefined, retryAfterSeconds(r.headers));
  if (r.status < 200 || r.status > 299) throw new ProviderError('provider_unavailable');
  const v = json(r.body) as { senders?: unknown } | null;
  if (!v || !Array.isArray(v.senders)) throw new ProviderError('invalid_payload', 'senders');
  return v.senders.slice(0, 200).flatMap((s): SenderCapability[] => {
    const x = s as { id?: unknown; email?: unknown; name?: unknown; active?: unknown };
    if ((typeof x.id !== 'number' && typeof x.id !== 'string') || typeof x.email !== 'string') return [];
    return [{ id: String(x.id), email: x.email.toLowerCase(), name: typeof x.name === 'string' ? x.name.slice(0, 100) : '', state: x.active === true ? 'sender_verified' : 'unverified' }];
  });
}

/**
 * POST /v3/smtp/email. 201 + messageId không rỗng → accepted. 2xx mà mã rỗng / hỏng → unknown (có thể đã nhận). 400 → từ chối vĩnh viễn;
 * 401 / 403 → khoá sai (vĩnh viễn tới khi sửa); 429 → tạm (Retry-After); 5xx → unknown (provider có thể đã nhận trước khi lỗi). Lỗi mạng
 * TRƯỚC khi gửi (core ném ProviderError) không đến được đây — người gọi ánh xạ; hết giờ sau khi gửi → unknown.
 */
export async function brevoSend(t: MailTransports, apiKey: string, sender: { email: string; name: string }, replyTo: string | undefined, m: TenantMailMessage): Promise<SendOutcome> {
  const body = {
    sender,
    to: [{ email: m.to }],
    subject: m.subject,
    htmlContent: m.html,
    textContent: m.text,
    ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    ...(m.listUnsubscribe ? { headers: { 'List-Unsubscribe': `<${m.listUnsubscribe}>` } } : {}),
    tags: [m.tag],
  };
  let r;
  try {
    r = await t.http({ method: 'POST', url: BREVO_SEND_URL, headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
  } catch (e) {
    // safeFetch: lỗi DNS / chặn host xảy ra trước khi mở kết nối → chắc chắn chưa gửi; hết giờ / đứt sau khi gửi → không rõ.
    if (e instanceof ProviderError && e.code === 'unsupported') return { state: 'failed_before_accept', retryable: false, reason: 'blocked_target' };
    return { state: 'unknown', reason: e instanceof ProviderError ? e.code : 'network' };
  }
  if (r.status === 201 || r.status === 202) {
    const id = (json(r.body) as { messageId?: unknown } | null)?.messageId;
    return typeof id === 'string' && /^<[^<>\s]{3,250}>$/.test(id) ? { state: 'accepted', providerMessageRef: id, evidence: `http_${r.status}` } : { state: 'unknown', reason: 'empty_message_id' };
  }
  if (r.status === 400) return { state: 'failed_before_accept', retryable: false, reason: 'rejected' };
  if (r.status === 401 || r.status === 403) return { state: 'failed_before_accept', retryable: false, reason: 'auth_failed' };
  if (r.status === 429) return { state: 'failed_before_accept', retryable: true, reason: 'rate_limited', retryAfterS: retryAfterSeconds(r.headers) };
  return { state: 'unknown', reason: `http_${r.status}` };
}
