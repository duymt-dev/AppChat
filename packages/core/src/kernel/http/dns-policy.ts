// Chính sách địa chỉ đích cho mọi lời gọi ra URL do người dùng / khách nhập (TIP-045b annex B, ops §3.3 SSRF): chỉ http / https, không
// userinfo, cổng mặc định hoặc 80 / 443 / 8080 / 8443; MỌI bản ghi A / AAAA phải là địa chỉ công khai — loopback, private, link-local,
// metadata, CGNAT, multicast, dành riêng, IPv4 ánh xạ / NAT64 / 6to4 trỏ vào dải cấm đều bị chặn; trả lời lẫn công khai + nội bộ → chặn
// (chống DNS rebinding chọn bản nội bộ ở lần phân giải sau). `resolveVetted` trả MỘT địa chỉ đã kiểm để safeFetch ghim vào socket.
import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

export type Refusal = 'scheme' | 'userinfo' | 'port' | 'host' | 'private_address' | 'mixed_answers' | 'dns_failed';

export class UrlRefusedError extends Error {
  constructor(readonly reason: Refusal) {
    super(`url_refused:${reason}`);
    this.name = 'UrlRefusedError';
  }
}

const V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const;
const V6 = [
  ['::', 128], ['::1', 128], ['100::', 64], ['2001::', 32], ['2001:db8::', 32], ['2001:10::', 28], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
] as const;

const blocked = new BlockList();
for (const [a, p] of V4) blocked.addSubnet(a, p, 'ipv4');
for (const [a, p] of V6) blocked.addSubnet(a, p, 'ipv6');

const PORTS = new Set(['', '80', '443', '8080', '8443']);

/** IPv4 nhúng trong IPv6 (ánh xạ `::ffff:a.b.c.d` / `::ffff:XXXX:XXXX`, NAT64 `64:ff9b::/96`, 6to4 `2002::/16`) → chuỗi IPv4, không có → null. */
export function embeddedV4(ip: string): string | null {
  const s = ip.toLowerCase();
  const dotted = /^(?:::ffff:|64:ff9b::)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (dotted) return dotted[1]!;
  const hex = /^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(s);
  const sixToFour = /^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})(?::|$)/.exec(s);
  const m = hex ?? sixToFour;
  if (!m) return null;
  const hi = parseInt(m[1]!, 16);
  const lo = parseInt(m[2]!, 16);
  return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
}

/** Địa chỉ IP literal có được gọi tới không (chỉ công khai). */
export function isPublicIp(ip: string): boolean {
  const fam = isIP(ip);
  if (fam === 4) return !blocked.check(ip, 'ipv4');
  if (fam !== 6) return false;
  const v4 = embeddedV4(ip);
  if (v4) return isPublicIp(v4);
  if (/^::ffff:/i.test(ip) || /^64:ff9b::/i.test(ip)) return false;
  return !blocked.check(ip, 'ipv6');
}

/** Kiểm cú pháp URL đích (không phân giải). `anyPort` chỉ dùng cho fixture test cục bộ. */
export function checkUrl(raw: string | URL, o: { anyPort?: boolean } = {}): URL {
  let u: URL;
  try {
    u = new URL(String(raw));
  } catch {
    throw new UrlRefusedError('host');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new UrlRefusedError('scheme');
  if (u.username || u.password) throw new UrlRefusedError('userinfo');
  if (!o.anyPort && !PORTS.has(u.port)) throw new UrlRefusedError('port');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw new UrlRefusedError('host');
  u.hash = '';
  return u;
}

export type Resolver = (host: string) => Promise<{ address: string; family: number }[]>;
export const systemResolver: Resolver = (host) => dnsLookup(host, { all: true, verbatim: true });

/** Phân giải tên → một địa chỉ công khai đã kiểm (IP literal kiểm thẳng). Mọi bản ghi phải công khai. `extra` = địa chỉ cụ thể được coi
 *  như công khai (CHỈ fixture test — safeFetch chỉ truyền khi NODE_ENV=test). */
export async function resolveVetted(u: URL, resolve: Resolver = systemResolver, extra: ReadonlySet<string> = new Set()): Promise<{ address: string; family: 4 | 6 }> {
  const ok = (ip: string) => extra.has(ip) || isPublicIp(ip);
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const lit = isIP(host);
  if (lit) {
    if (!ok(host)) throw new UrlRefusedError('private_address');
    return { address: host, family: lit as 4 | 6 };
  }
  let answers: { address: string; family: number }[];
  try {
    answers = await resolve(host);
  } catch {
    throw new UrlRefusedError('dns_failed');
  }
  if (!answers.length) throw new UrlRefusedError('dns_failed');
  const bad = answers.filter((a) => !ok(a.address));
  if (bad.length === answers.length) throw new UrlRefusedError('private_address');
  if (bad.length) throw new UrlRefusedError('mixed_answers');
  const a = answers[0]!;
  return { address: a.address, family: a.family === 6 ? 6 : 4 };
}
