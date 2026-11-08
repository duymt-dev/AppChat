// Cầu mạng cho adapter mail của DN (TIP-012c §1.3–§1.4): core dựng MailTransports rồi tiêm vào adapter — package integrations không tự mở
// mạng. HTTP Brevo qua safeFetch (host cố định api.brevo.com, KHÔNG redirect, trần 1 MiB, 10 giây; POST chỉ khi không redirect); SMTP qua
// tenantSmtpFactory với resolver DNS của kernel (mọi A / AAAA, ghim IP công khai). Lỗi mạng → ProviderError đã làm sạch. Test tiêm `http` /
// `smtpCreate` / `resolve` giả — không mạng thật. `TENANT_MAIL_TRANSPORT=fake` (chỉ dev / test / ai:live — cấm production): Brevo giả trong
// bộ nhớ — một người gửi đã kích hoạt cố định (FAKE_SENDER), gửi → 201 + messageId; khoá chứa `unknown` → 503 sau khi gửi (kết quả unknown).
import { ProviderError, tenantSmtpFactory, type MailTransports } from '@appchat/integrations';
import { FetchLimitError, safeFetch, type SafeFetchOptions } from '../../kernel/http/safe-fetch';
import { systemResolver, UrlRefusedError } from '../../kernel/http/dns-policy';
import { PROVIDER_MAX_BYTES, PROVIDER_TIMEOUT_MS } from '../operations/provider-http';

export const MAIL_HOSTS = new Set(['api.brevo.com']);

export interface MailTransportOptions {
  /** Test: thay HTTP (không gọi mạng). */
  http?: MailTransports['http'];
  fetchOptions?: Pick<SafeFetchOptions, 'resolve' | 'testAllowAddresses'>;
  /** Test: resolver SMTP + transport giả. */
  resolve?: (host: string) => Promise<string[]>;
  smtpCreate?: Parameters<typeof tenantSmtpFactory>[1];
}

const sysResolve = async (host: string) => (await systemResolver(host)).map((a) => a.address);

let fakeSeq = 0;
export const FAKE_SENDER = 'news@ai-live.test';
/** Brevo giả (TENANT_MAIL_TRANSPORT=fake): không mạng; một người gửi đã kích hoạt cố định; khoá chứa `bad` → 401. */
export const fakeBrevoHttp: MailTransports['http'] = async (req) => {
  const key = req.headers['api-key'] ?? '';
  if (!key || key.includes('bad')) return { status: 401, headers: {}, body: '{"code":"unauthorized"}' };
  if (req.method === 'GET') {
    return { status: 200, headers: {}, body: JSON.stringify({ senders: [{ id: 1, email: FAKE_SENDER, name: 'AI Live', active: true }] }) };
  }
  if (key.includes('unknown')) return { status: 503, headers: {}, body: '{}' };
  return { status: 201, headers: {}, body: JSON.stringify({ messageId: `<fake-${Date.now().toString(36)}-${++fakeSeq}@smtp-relay.mailin.fr>` }) };
};

export function mailTransports(o: MailTransportOptions = {}): MailTransports {
  const fake = !o.http && process.env.TENANT_MAIL_TRANSPORT === 'fake';
  if (fake && process.env.NODE_ENV === 'production') throw new Error('TENANT_MAIL_TRANSPORT=fake cấm ở production');
  const http: MailTransports['http'] =
    o.http ??
    (fake ? fakeBrevoHttp : undefined) ??
    (async (req) => {
      let u: URL;
      try {
        u = new URL(req.url);
      } catch {
        throw new ProviderError('unsupported', 'url');
      }
      if (u.protocol !== 'https:' || !MAIL_HOSTS.has(u.hostname)) throw new ProviderError('unsupported', 'url');
      try {
        const r = await safeFetch(u, { ...o.fetchOptions, method: req.method, ...(req.body !== undefined ? { body: req.body } : {}), headers: req.headers, maxRedirects: 0, maxBytes: PROVIDER_MAX_BYTES, timeoutMs: PROVIDER_TIMEOUT_MS });
        return { status: r.status, headers: r.headers, body: r.body.toString('utf8') };
      } catch (e) {
        // Chặn đích / DNS trước khi mở kết nối → chắc chắn chưa gửi (`unsupported`); hết giờ / đứt → có thể đã gửi (người gọi coi là unknown).
        if (e instanceof UrlRefusedError) throw new ProviderError('unsupported', 'url');
        if (e instanceof FetchLimitError && e.reason === 'timeout') throw new ProviderError('timeout');
        throw new ProviderError('provider_unavailable');
      }
    });
  return { http, smtp: tenantSmtpFactory(o.resolve ?? sysResolve, o.smtpCreate) };
}
