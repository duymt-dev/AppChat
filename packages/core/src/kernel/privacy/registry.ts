// Registry adapter "Quên khách" (TIP-015c §2.2, mirror kernel/contact-lifecycle/registry.ts): 13 domain đăng ký đúng một lần lúc boot
// qua module `*/privacy/module.ts`. Thiếu adapter nào → 503 (fail closed) — KHÔNG BAO GIỜ coi kiểm kê rỗng là đã quét đủ.
import { AppError } from '@appchat/shared';
import { PRIVACY_DOMAINS, type PrivacyAdapter, type PrivacyDomain } from './types';

const ADAPTERS = new Map<PrivacyDomain, PrivacyAdapter>();

export function registerPrivacyAdapter(a: PrivacyAdapter): void {
  const cur = ADAPTERS.get(a.domain);
  if (cur && cur !== a) throw new Error(`PrivacyAdapter '${a.domain}' đã đăng ký`);
  ADAPTERS.set(a.domain, a);
}

/** Đủ 13 adapter theo thứ tự cố định — thiếu bất kỳ → 503 (fail closed, không fallback kiểm kê rỗng). */
export function privacyAdapters(): PrivacyAdapter[] {
  const missing = PRIVACY_DOMAINS.filter((d) => !ADAPTERS.has(d));
  if (missing.length) throw new AppError('WORKSPACE_UNAVAILABLE', 503, Object.fromEntries(missing.map((d) => [d, 'adapter_unavailable'])));
  return PRIVACY_DOMAINS.map((d) => ADAPTERS.get(d)!);
}

export const registeredPrivacyDomains = (): PrivacyDomain[] => [...ADAPTERS.keys()].sort();

/** Chỉ test: gỡ adapter. */
export function unregisterPrivacyAdapter(domain: PrivacyDomain): void {
  ADAPTERS.delete(domain);
}
