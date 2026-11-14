// safeFetch (TIP-045b annex B, ops §3.3): gọi URL do người dùng / khách nhập mà không mở đường SSRF. Mỗi chặng (kể cả redirect):
// kiểm URL → phân giải + kiểm MỌI địa chỉ → GHIM địa chỉ đã kiểm vào socket (node:http(s) `lookup` cố định — không phân giải lần hai,
// HTTPS vẫn kiểm chứng chỉ theo hostname qua `servername`). Tối đa 3 redirect, không mang header nhạy cảm sang origin khác, timeout tổng,
// đọc thân theo luồng và cắt khi vượt số byte SAU giải nén (gzip / deflate / br) — không buffer cả thân trước khi kiểm.
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import type { LookupFunction } from 'node:net';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import type { Readable } from 'node:stream';
import { checkUrl, resolveVetted, systemResolver, UrlRefusedError, type Resolver } from './dns-policy';

export { UrlRefusedError, type Refusal } from './dns-policy';

export const SAFE_FETCH_DEFAULTS = { maxBytes: 10 * 1024 * 1024, timeoutMs: 10_000, maxRedirects: 3 } as const;

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  /** Thay DNS (test dùng resolver giả — không gọi Internet). */
  resolve?: Resolver;
  /** Địa chỉ cụ thể coi như công khai + bỏ kiểm cổng — CHỈ có hiệu lực khi NODE_ENV=test (fixture HTTP cục bộ 127.0.0.1); môi trường
   *  khác bỏ qua. Redirect sang địa chỉ khác vẫn bị kiểm như thường. */
  testAllowAddresses?: string[];
  /** POST có thân (TIP-012c — API gửi thư của provider): chỉ khi `maxRedirects: 0` (không bao giờ gửi lại thân sang đích chuyển hướng). */
  method?: 'GET' | 'POST';
  body?: string;
}

export interface SafeResponse {
  status: number;
  url: string;
  headers: Record<string, string>;
  body: Buffer;
}

export class FetchLimitError extends Error {
  constructor(readonly reason: 'too_large' | 'timeout' | 'too_many_redirects' | 'bad_redirect') {
    super(`fetch_limit:${reason}`);
    this.name = 'FetchLimitError';
  }
}

/** Header được mang sang origin khác khi redirect (không cookie / authorization). */
const CROSS_ORIGIN_SAFE = new Set(['user-agent', 'accept', 'accept-language']);

function decoded(res: IncomingMessage): Readable {
  const enc = String(res.headers['content-encoding'] ?? '').toLowerCase().trim();
  if (enc === 'gzip' || enc === 'x-gzip') return res.pipe(createGunzip());
  if (enc === 'deflate') return res.pipe(createInflate());
  if (enc === 'br') return res.pipe(createBrotliDecompress());
  return res;
}

function once(u: URL, pinned: { address: string; family: 4 | 6 }, headers: Record<string, string>, signal: AbortSignal, method: 'GET' | 'POST' = 'GET', body?: string): Promise<IncomingMessage> {
  const lookup: LookupFunction = (_host, opts, cb) => {
    if ((opts as { all?: boolean }).all) (cb as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [pinned]);
    else cb(null, pinned.address, pinned.family);
  };
  const req = (u.protocol === 'https:' ? httpsRequest : httpRequest)(u, {
    method,
    headers: { 'accept-encoding': 'gzip, deflate, br', ...headers, ...(body !== undefined ? { 'content-length': String(Buffer.byteLength(body)) } : {}) },
    lookup,
    servername: u.hostname.replace(/^\[|\]$/g, ''),
    signal,
    agent: false,
  });
  return new Promise((ok, no) => {
    req.once('response', ok);
    req.once('error', no);
    req.end(body);
  });
}

async function readBounded(res: IncomingMessage, max: number): Promise<Buffer> {
  const declared = Number(res.headers['content-length'] ?? 0);
  if (!res.headers['content-encoding'] && declared > max) {
    res.destroy();
    throw new FetchLimitError('too_large');
  }
  const chunks: Buffer[] = [];
  let n = 0;
  const stream = decoded(res);
  for await (const c of stream as AsyncIterable<Buffer>) {
    n += c.length;
    if (n > max) {
      stream.destroy();
      res.destroy();
      throw new FetchLimitError('too_large');
    }
    chunks.push(c);
  }
  return Buffer.concat(chunks, n);
}

export async function safeFetch(raw: string | URL, o: SafeFetchOptions = {}): Promise<SafeResponse> {
  const maxBytes = o.maxBytes ?? SAFE_FETCH_DEFAULTS.maxBytes;
  const maxRedirects = o.maxRedirects ?? SAFE_FETCH_DEFAULTS.maxRedirects;
  if ((o.method === 'POST' || o.body !== undefined) && maxRedirects !== 0) throw new FetchLimitError('bad_redirect');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? SAFE_FETCH_DEFAULTS.timeoutMs);
  const resolve = o.resolve ?? systemResolver;
  const extra = new Set(process.env.NODE_ENV === 'test' ? (o.testAllowAddresses ?? []) : []);
  const anyPort = extra.size > 0;
  let headers = { ...(o.headers ?? {}) };
  let u = checkUrl(raw, { anyPort });
  const origin0 = u.origin;
  try {
    for (let hop = 0; ; hop++) {
      const pinned = await resolveVetted(u, resolve, extra);
      const res = await once(u, pinned, headers, ctl.signal, o.method ?? 'GET', o.body);
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if (hop >= maxRedirects) throw new FetchLimitError('too_many_redirects');
        let next: URL;
        try {
          next = checkUrl(new URL(res.headers.location, u), { anyPort });
        } catch (e) {
          throw e instanceof UrlRefusedError ? e : new FetchLimitError('bad_redirect');
        }
        if (next.origin !== origin0) headers = Object.fromEntries(Object.entries(headers).filter(([k]) => CROSS_ORIGIN_SAFE.has(k.toLowerCase())));
        u = next;
        continue;
      }
      const body = await readBounded(res, maxBytes);
      const h: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) h[k] = Array.isArray(v) ? v.join(', ') : v;
      return { status, url: u.toString(), headers: h, body };
    }
  } catch (e) {
    if (ctl.signal.aborted) throw new FetchLimitError('timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

