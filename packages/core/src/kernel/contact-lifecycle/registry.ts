// Registry port phụ thuộc vòng đời khách (TIP-015f §2.1): 7 domain đăng ký đúng một lần lúc boot (module `*/contact-lifecycle` chỉ-đọc,
// dùng chung một singleton); CRM chỉ đọc registry. Trùng → lỗi boot; thiếu port → 503 cho cả thao tác (không bao giờ coi là 0 phụ thuộc).
import { AppError } from '@appchat/shared';
import { LIFECYCLE_DOMAINS, type ContactLifecyclePort, type LifecycleDomain } from './ports';

const PORTS = new Map<LifecycleDomain, ContactLifecyclePort>();

export function registerLifecyclePort(port: ContactLifecyclePort): void {
  const cur = PORTS.get(port.domain);
  if (cur && cur !== port) throw new Error(`ContactLifecyclePort '${port.domain}' đã đăng ký`);
  PORTS.set(port.domain, port);
}

/** Đủ 7 port theo thứ tự cố định — thiếu bất kỳ → 503 (fail closed). */
export function lifecyclePorts(): ContactLifecyclePort[] {
  const missing = LIFECYCLE_DOMAINS.filter((d) => !PORTS.has(d));
  if (missing.length) throw new AppError('WORKSPACE_UNAVAILABLE', 503, Object.fromEntries(missing.map((d) => [d, 'port_unavailable'])));
  return LIFECYCLE_DOMAINS.map((d) => PORTS.get(d)!);
}

export const registeredLifecycleDomains = (): LifecycleDomain[] => [...PORTS.keys()].sort();

/** Chỉ test: gỡ port. */
export function unregisterLifecyclePort(domain: LifecycleDomain): void {
  PORTS.delete(domain);
}
