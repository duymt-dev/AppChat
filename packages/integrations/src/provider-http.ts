// HTTP đọc ra provider (TIP-012b §1.4): adapter chỉ nhận hàm `ProviderHttp` do core tiêm (core bọc safeFetch — DNS / rebinding, timeout,
// trần byte, không redirect). URL cố định trong adapter, không bao giờ lấy từ cấu hình / model. Chỉ GET (đọc an toàn, thử lại được).
// Phản hồi lỗi ánh xạ sang mã ổn định (ProviderError) — không trả nguyên văn body / thông điệp provider.
import { ProviderError } from './provider-errors';

export interface ProviderHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** GET `url` với header cho sẵn; lỗi mạng / quá giờ phải ném ProviderError (`timeout` / `provider_unavailable`) — core lo phần này. */
export type ProviderHttp = (url: string, headers: Record<string, string>) => Promise<ProviderHttpResponse>;

/** `Retry-After` (giây hoặc ngày HTTP) → giây, chặn 1–3600; không có / sai → undefined. */
export function retryAfterSeconds(h: Record<string, string>, nowMs = Date.now()): number | undefined {
  const v = h['retry-after'] ?? h['x-sepay-userapi-retry-after'];
  if (!v) return undefined;
  const n = /^\d{1,6}$/.test(v.trim()) ? Number(v.trim()) : Math.ceil((Date.parse(v) - nowMs) / 1000);
  return Number.isFinite(n) ? Math.min(3600, Math.max(1, n)) : undefined;
}

/** GET JSON object: 401 / 403 → auth_failed, 429 → rate_limited (+ Retry-After), khác 2xx → provider_unavailable, JSON hỏng → invalid_payload. */
export async function getJson(http: ProviderHttp, url: string, headers: Record<string, string>): Promise<Record<string, unknown>> {
  const r = await http(url, { accept: 'application/json', ...headers });
  if (r.status === 401 || r.status === 403) throw new ProviderError('auth_failed');
  if (r.status === 429) throw new ProviderError('rate_limited', undefined, retryAfterSeconds(r.headers));
  if (r.status < 200 || r.status > 299) throw new ProviderError('provider_unavailable');
  let v: unknown;
  try {
    v = JSON.parse(r.body);
  } catch {
    throw new ProviderError('invalid_payload', 'body');
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ProviderError('invalid_payload', 'body');
  return v as Record<string, unknown>;
}
