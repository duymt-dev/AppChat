// Cầu mạng cho adapter mail của DN (TIP-012c §1.3–§1.4): core dựng MailTransports rồi tiêm vào adapter — package integrations không tự mở
// mạng. HTTP Brevo qua safeFetch (host cố định api.brevo.com, KHÔNG redirect, trần 1 MiB, 10 giây; POST chỉ khi không redirect); SMTP qua
// tenantSmtpFactory với resolver DNS của kernel (mọi A / AAAA, ghim IP công khai). Lỗi mạng → ProviderError đã làm sạch. Test tiêm `http` /
// `smtpCreate` / `resolve` giả — không mạng thật.
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

export function mailTransports(o: MailTransportOptions = {}): MailTransports {
  const http: MailTransports['http'] =
    o.http ??
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
