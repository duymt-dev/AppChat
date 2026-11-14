// Kiểm base_url provider LLM (TIP-040 AC04, DC-371) bằng chính sách SSRF của 045b (kernel/http/dns-policy): http(s), không userinfo,
// cổng chuẩn, MỌI bản ghi DNS công khai (loopback / private / metadata / CGNAT… bị chặn, trả lời lẫn → chặn). Provider router nội bộ
// (9router trong VPS) chỉ qua allowlist CỦA TRIỂN KHAI: env `LLM_PRIVATE_HOSTS` (host[:port], phân cách dấu phẩy) — không có cờ nào
// trong input admin mở được địa chỉ nội bộ. Production bắt buộc https trừ host trong allowlist.
// Lưu ý: lời gọi model thật đi qua fetch của AI SDK — kiểm ở đây chặn lúc LƯU + trước mỗi lần probe (DNS đổi sau đó: probe kiểm lại).
import { AppError } from '@appchat/shared';
import { checkUrl, resolveVetted, systemResolver, UrlRefusedError, type Resolver } from '../../kernel/http/dns-policy';

export interface ProviderUrlPolicy {
  privateHosts: ReadonlySet<string>;
  production: boolean;
  resolve?: Resolver;
}

export const providerUrlPolicy = (env: Record<string, string | undefined>, resolve?: Resolver): ProviderUrlPolicy => ({
  privateHosts: new Set(
    (env.LLM_PRIVATE_HOSTS ?? '')
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  ),
  production: env.NODE_ENV === 'production',
  ...(resolve ? { resolve } : {}),
});

/** Kiểm + chuẩn hoá base_url; lỗi → 422 `base_url: <lý do>`. */
export async function vetProviderUrl(raw: string, p: ProviderUrlPolicy): Promise<string> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new AppError('VALIDATION_FAILED', 422, { base_url: 'invalid' });
  }
  const hostPort = (u.port ? `${u.hostname}:${u.port}` : u.hostname).toLowerCase();
  if (p.privateHosts.has(hostPort) || p.privateHosts.has(u.hostname.toLowerCase())) {
    if (u.username || u.password) throw new AppError('VALIDATION_FAILED', 422, { base_url: 'userinfo' });
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new AppError('VALIDATION_FAILED', 422, { base_url: 'scheme' });
    return u.toString().replace(/\/$/, '');
  }
  if (p.production && u.protocol !== 'https:') throw new AppError('VALIDATION_FAILED', 422, { base_url: 'https_required' });
  try {
    const v = checkUrl(u);
    await resolveVetted(v, p.resolve ?? systemResolver);
    return v.toString().replace(/\/$/, '');
  } catch (e) {
    if (e instanceof UrlRefusedError) throw new AppError('VALIDATION_FAILED', 422, { base_url: e.reason });
    throw e;
  }
}
