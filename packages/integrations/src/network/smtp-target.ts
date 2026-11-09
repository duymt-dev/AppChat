// Đích SMTP của DN (TIP-012c §1.4): chuẩn hoá hostname, phân giải MỌI A / AAAA, từ chối nếu có bất kỳ địa chỉ không công khai (loopback /
// private / link-local / multicast / metadata / unspecified / IPv4 nhúng IPv6) — câu trả lời trộn an toàn + không an toàn cũng từ chối.
// Chỉ 465 (TLS ngầm) hoặc 587 (STARTTLS bắt buộc); không cổng 25 / plaintext / auth trước TLS / tắt kiểm chứng chỉ. Trả cấu hình
// nodemailer ghim IP đã duyệt + servername = host gốc (SNI + kiểm chứng chỉ theo tên). Mỗi kết nối mới phân giải lại. Resolver do core tiêm.
import { isIP } from 'node:net';
import { tlsFor, type SmtpTls } from '../tenant-mail-validation';

export type SmtpResolver = (host: string) => Promise<string[]>;

export class SmtpTargetError extends Error {
  constructor(readonly reason: 'host' | 'port' | 'dns' | 'private_address') {
    super(`smtp_target:${reason}`);
    this.name = 'SmtpTargetError';
  }
}

const v4 = (ip: string) => ip.split('.').map(Number);
function publicV4(ip: string): boolean {
  const [a, b, c] = v4(ip) as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT
  if (a === 169 && b === 254) return false; // link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}
function publicV6(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x === '::' || x === '::1') return false;
  const mapped = /^(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/.exec(x);
  if (mapped) return publicV4(mapped[1]!);
  if (/^(fc|fd|fe8|fe9|fea|feb|ff)/.test(x)) return false; // ULA / link-local / multicast
  if (x.startsWith('64:ff9b:') || x.startsWith('2001:db8') || x.startsWith('100::')) return false;
  return true;
}
export const isPublicAddress = (ip: string) => (isIP(ip) === 4 ? publicV4(ip) : isIP(ip) === 6 ? publicV6(ip) : false);

export interface SmtpTarget {
  host: string;
  address: string;
  port: 465 | 587;
  tls: SmtpTls;
}

/** Kiểm + ghim: host là tên miền (không IP / localhost), mọi địa chỉ công khai; chọn địa chỉ đầu đã duyệt. */
export async function resolveSmtpTarget(rawHost: string, rawPort: string, resolve: SmtpResolver): Promise<SmtpTarget> {
  const host = rawHost.trim().toLowerCase().replace(/\.$/, '');
  if (!host || isIP(host) || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || !/^[a-z0-9.-]{1,253}$/.test(host) || !host.includes('.')) throw new SmtpTargetError('host');
  const tls = tlsFor(rawPort);
  if (!tls) throw new SmtpTargetError('port');
  let ips: string[];
  try {
    ips = await resolve(host);
  } catch {
    throw new SmtpTargetError('dns');
  }
  if (!ips.length) throw new SmtpTargetError('dns');
  if (ips.some((ip) => !isPublicAddress(ip))) throw new SmtpTargetError('private_address');
  return { host, address: ips[0]!, port: rawPort === '465' ? 465 : 587, tls };
}

/** Tuỳ chọn nodemailer cố định cho đích đã ghim — không nhận tuỳ chọn transport từ cấu hình. */
export function smtpTransportOptions(t: SmtpTarget, auth: { user: string; pass: string }) {
  return {
    host: t.address,
    port: t.port,
    secure: t.tls === 'implicit',
    requireTLS: t.tls === 'starttls',
    ignoreTLS: false,
    auth,
    tls: { servername: t.host, rejectUnauthorized: true, minVersion: 'TLSv1.2' as const },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
