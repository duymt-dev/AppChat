// Phụ thuộc của họ khách qua 7 port domain + CRM (TIP-015f §2.2–§2.3). Chặn = tồn tại bất kỳ mục chặn (không theo scope người xem) → 409
// HAS_DEPENDENCIES chỉ có loại + số (không id / tiền ẩn). Cảnh báo giữ lại (không huỷ / xoá theo). Thiếu port → 503 (registry).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { LifecycleDependency } from '../../kernel/contact-lifecycle/ports';
import { lifecyclePorts } from '../../kernel/contact-lifecycle/registry';

export async function familyDependencies(tx: TenantTx, ids: readonly string[]): Promise<LifecycleDependency[]> {
  const out: LifecycleDependency[] = [];
  for (const p of lifecyclePorts()) out.push(...(await p.dependencies(tx, ids)));
  return out;
}

export const blockers = (deps: LifecycleDependency[]) => deps.filter((d) => d.level === 'block');

/** Có mục chặn → 409 HAS_DEPENDENCIES { <kind>: count } (không lộ id / tiền). */
export function assertNoBlockers(deps: LifecycleDependency[]): void {
  const b = blockers(deps);
  if (b.length) throw new AppError('HAS_DEPENDENCIES', 409, Object.fromEntries(b.map((d) => [d.kind, String(d.count)])));
}

/** Họ khách có quan hệ nghiệp vụ nào (kể cả đã đóng) — điều kiện "nguyên trạng" của hoàn tác tạo khách. */
export async function familyHasRelations(tx: TenantTx, ids: readonly string[]): Promise<boolean> {
  for (const p of lifecyclePorts()) if (await p.hasRelations(tx, ids)) return true;
  return false;
}
