// Cầu HTTP cho adapter provider (TIP-012b §1.4): adapter chỉ nhận `ProviderHttp`; core bọc safeFetch (DNS / rebinding, ghim IP, timeout
// 10 giây, trần 1 MiB, KHÔNG redirect) và chỉ cho host trong danh sách cố định — URL lạ (kể cả do lỗi adapter) bị từ chối trước khi gọi.
// Lỗi mạng / giới hạn → ProviderError đã làm sạch (`timeout` / `provider_unavailable`), không mang URL / header / thân.
import { ProviderError, type ProviderHttp } from '@appchat/integrations';
import { FetchLimitError, safeFetch, type SafeFetchOptions } from '../../kernel/http/safe-fetch';

/** Host đọc của provider ngân hàng (hợp đồng test/fixtures/{casso,sepay}/contracts.json → `read.base_url`). */
export const PROVIDER_HOSTS = new Set(['oauth.casso.vn', 'userapi.sepay.vn']);
export const PROVIDER_MAX_BYTES = 1024 * 1024;
export const PROVIDER_TIMEOUT_MS = 10_000;

export interface ProviderHttpOptions {
  hosts?: Set<string>;
  /** Test: resolver giả / địa chỉ cục bộ (safeFetch chỉ nhận khi NODE_ENV=test). */
  fetchOptions?: Pick<SafeFetchOptions, 'resolve' | 'testAllowAddresses'>;
  /** Test: thay hẳn transport (không gọi mạng). */
  transport?: ProviderHttp;
}

export function providerHttp(o: ProviderHttpOptions = {}): ProviderHttp {
  const hosts = o.hosts ?? PROVIDER_HOSTS;
  return async (url, headers) => {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new ProviderError('unsupported', 'url');
    }
    if (u.protocol !== 'https:' || !hosts.has(u.hostname)) throw new ProviderError('unsupported', 'url');
    if (o.transport) return o.transport(url, headers);
    try {
      const r = await safeFetch(u, { ...o.fetchOptions, headers, maxRedirects: 0, maxBytes: PROVIDER_MAX_BYTES, timeoutMs: PROVIDER_TIMEOUT_MS });
      return { status: r.status, headers: r.headers, body: r.body.toString('utf8') };
    } catch (e) {
      if (e instanceof FetchLimitError && e.reason === 'timeout') throw new ProviderError('timeout');
      throw new ProviderError('provider_unavailable');
    }
  };
}
