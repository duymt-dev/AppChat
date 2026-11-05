// TIP-045b AC1 / annex B — safeFetch trên máy chủ HTTP cục bộ + resolver giả (không gọi Internet): chặn loopback / private / metadata /
// IPv6 loopback / IPv4 ánh xạ / NAT64 / 6to4, trả lời DNS lẫn công khai + nội bộ (rebinding), redirect sang IP nội bộ, quá 3 redirect,
// thân quá giới hạn (kể cả gzip nở to), timeout; header nhạy cảm không theo redirect sang origin khác; địa chỉ đã kiểm được ghim vào socket.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkUrl, embeddedV4, isPublicIp, resolveVetted, type Resolver } from '../src/kernel/http/dns-policy';
import { FetchLimitError, safeFetch, UrlRefusedError } from '../src/kernel/http/safe-fetch';

let srv: Server;
let port = 0;
const seen: { path: string; host?: string; auth?: string }[] = [];
const LOCAL = ['127.0.0.1'];

beforeAll(async () => {
  srv = createServer((req, res) => {
    seen.push({ path: req.url ?? '', host: req.headers.host, auth: req.headers.authorization });
    const u = new URL(req.url ?? '/', 'http://x');
    if (u.pathname === '/ok') return res.end('xin chào');
    if (u.pathname === '/to-meta') return res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data' }).end();
    if (u.pathname === '/to-other') return res.writeHead(302, { location: `http://other.test:${port}/ok` }).end();
    if (u.pathname === '/loop') return res.writeHead(302, { location: '/loop' }).end();
    if (u.pathname === '/big') return res.end(Buffer.alloc(2048, 97));
    if (u.pathname === '/bomb') {
      res.writeHead(200, { 'content-encoding': 'gzip' });
      return res.end(gzipSync(Buffer.alloc(5 * 1024 * 1024, 0)));
    }
    if (u.pathname === '/slow') return void setTimeout(() => res.end('muộn'), 2000);
    res.writeHead(404).end();
  });
  await new Promise<void>((ok) => srv.listen(0, '127.0.0.1', ok));
  port = (srv.address() as AddressInfo).port;
});
afterAll(() => new Promise<void>((ok) => srv.close(() => ok())));

/** Resolver giả: tên → địa chỉ cố định (không DNS thật). */
const fake = (map: Record<string, string[]>): Resolver => async (h) => (map[h] ?? []).map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));

describe('dns-policy', () => {
  it('địa chỉ cấm: loopback / private / link-local / metadata / CGNAT / multicast / IPv6 loopback, ULA, ánh xạ IPv4, NAT64, 6to4', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '64:ff9b::a9fe:a9fe', '2002:7f00:1::1']) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
    for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) expect(isPublicIp(ip), ip).toBe(true);
    expect(embeddedV4('::ffff:a9fe:a9fe')).toBe('169.254.169.254');
  });

  it('URL: chỉ http / https, không userinfo, cổng lạ, localhost / .internal; bỏ fragment', () => {
    for (const [u, r] of [['file:///etc/passwd', 'scheme'], ['ftp://a.test/', 'scheme'], ['http://u:p@a.test/', 'userinfo'], ['http://a.test:22/', 'port'], ['http://localhost/', 'host'], ['http://db.internal/', 'host']] as const) {
      expect(() => checkUrl(u), u).toThrow(new UrlRefusedError(r));
    }
    expect(checkUrl('https://a.test/x#frag').toString()).toBe('https://a.test/x');
  });

  it('phân giải: mọi bản ghi phải công khai; lẫn công khai + nội bộ → mixed_answers; IP literal số khác dạng', async () => {
    await expect(resolveVetted(new URL('http://rebind.test/'), fake({ 'rebind.test': ['8.8.8.8', '127.0.0.1'] }))).rejects.toThrow(new UrlRefusedError('mixed_answers'));
    await expect(resolveVetted(new URL('http://in.test/'), fake({ 'in.test': ['10.0.0.5'] }))).rejects.toThrow(new UrlRefusedError('private_address'));
    await expect(resolveVetted(new URL('http://v6.test/'), fake({ 'v6.test': ['::1'] }))).rejects.toThrow(new UrlRefusedError('private_address'));
    await expect(resolveVetted(new URL('http://none.test/'), fake({}))).rejects.toThrow(new UrlRefusedError('dns_failed'));
    // WHATWG URL chuẩn hoá 2130706433 / 0x7f.1 / 017700000001 → 127.0.0.1 trước khi kiểm.
    for (const h of ['http://2130706433/', 'http://0x7f.1/', 'http://017700000001/', 'http://[::ffff:127.0.0.1]/']) {
      await expect(resolveVetted(new URL(h), fake({})), h).rejects.toThrow(new UrlRefusedError('private_address'));
    }
    expect(await resolveVetted(new URL('http://pub.test/'), fake({ 'pub.test': ['8.8.8.8'] }))).toEqual({ address: '8.8.8.8', family: 4 });
  });
});

describe('safeFetch (máy chủ cục bộ)', () => {
  const base = () => `http://shop.test:${port}`;
  const opts = (extra: object = {}) => ({ resolve: fake({ 'shop.test': ['127.0.0.1'], 'other.test': ['127.0.0.1'] }), testAllowAddresses: LOCAL, ...extra });

  it('không có địa chỉ cho phép → 127.0.0.1 bị chặn trước khi mở socket', async () => {
    const n = seen.length;
    await expect(safeFetch(`http://127.0.0.1:${port}/ok`)).rejects.toThrow(UrlRefusedError);
    await expect(safeFetch(`${base()}/ok`, { resolve: fake({ 'shop.test': ['127.0.0.1'] }) })).rejects.toThrow(UrlRefusedError);
    expect(seen.length).toBe(n);
  });

  it('địa chỉ đã kiểm được ghim: Host header giữ tên miền, nội dung đọc đủ', async () => {
    const r = await safeFetch(`${base()}/ok`, opts());
    expect(r.status).toBe(200);
    expect(r.body.toString('utf8')).toBe('xin chào');
    expect(seen.at(-1)!.host).toBe(`shop.test:${port}`);
  });

  it('redirect sang metadata 169.254.169.254 bị chặn; quá 3 redirect bị chặn', async () => {
    await expect(safeFetch(`${base()}/to-meta`, opts())).rejects.toThrow(new UrlRefusedError('private_address'));
    await expect(safeFetch(`${base()}/loop`, opts())).rejects.toThrow(new FetchLimitError('too_many_redirects'));
  });

  it('redirect sang origin khác bỏ authorization / cookie', async () => {
    const r = await safeFetch(`${base()}/to-other`, opts({ headers: { authorization: 'Bearer secret-token', 'user-agent': 'AppChatBot' } }));
    expect(r.status).toBe(200);
    expect(seen.at(-2)!.auth).toBe('Bearer secret-token');
    expect(seen.at(-1)!.auth).toBeUndefined();
  });

  it('thân quá giới hạn (thường và gzip nở 5MB) bị cắt; timeout', async () => {
    await expect(safeFetch(`${base()}/big`, opts({ maxBytes: 1024 }))).rejects.toThrow(new FetchLimitError('too_large'));
    await expect(safeFetch(`${base()}/bomb`, opts({ maxBytes: 1024 * 1024 }))).rejects.toThrow(new FetchLimitError('too_large'));
    await expect(safeFetch(`${base()}/slow`, opts({ timeoutMs: 200 }))).rejects.toThrow(new FetchLimitError('timeout'));
  });

  it('địa chỉ cho phép của test vô hiệu khi NODE_ENV ≠ test', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(safeFetch(`${base()}/ok`, opts())).rejects.toThrow(UrlRefusedError);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
