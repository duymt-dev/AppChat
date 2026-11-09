// contact.privacy_preview (TIP-015c §1.2): khoá họ khách, kiểm kê 13 domain, chặn (DC-262) — không ghi gì. inventory_revision = SHA256
// bản kiểm kê (ổn định theo thứ tự id) để contact.forget đối chiếu lại đúng dữ liệu đã xem trước (không đổi âm thầm giữa preview → accept).
import { createHash } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockFamily } from '../../crm/lifecycle/lock';
import { familyDependencies, blockers } from '../../crm/lifecycle/dependencies';
import { familyInventory } from '../../kernel/privacy/provenance';
import type { PrivacyPreview } from '@appchat/shared';

/** Digest ổn định của kiểm kê — sắp theo (kind, recordId) trước khi băm, để cùng tập hợp luôn ra cùng revision. */
export function inventoryRevisionOf(artifacts: readonly { kind: string; recordId: string; revision: number }[]): string {
  const sorted = [...artifacts].sort((a, b) => (a.kind === b.kind ? a.recordId.localeCompare(b.recordId) : a.kind.localeCompare(b.kind)));
  return createHash('sha256').update(JSON.stringify(sorted.map((a) => [a.kind, a.recordId, a.revision]))).digest('hex');
}

export async function privacyPreview(tx: TenantTx, contactId: string): Promise<PrivacyPreview> {
  const fam = await lockFamily(tx, contactId);
  const deps = await familyDependencies(tx, fam.ids);
  const b = blockers(deps);
  const inv = await familyInventory(tx, fam.ids);
  return {
    canonical_contact_id: fam.root.id,
    family_generation: fam.root.lifecycleRevision,
    family_size: fam.ids.length,
    inventory_revision: inventoryRevisionOf(inv.artifacts),
    blockers: b.map((d) => ({ kind: d.kind, count: d.count })),
    removable_count: inv.removableCount,
    shared_count: inv.sharedCount,
    retained_count: inv.retainedCount,
    irreversible: true,
    no_external_deletion: true,
  };
}

/** Đã khoá quyền `privacy.erase` ở permission action — không kiểm lại Owner ở đây (DC-259..265 đã duyệt cho permission này). */
export function assertNoOpenBlockers(preview: Pick<PrivacyPreview, 'blockers'>): void {
  if (preview.blockers.length) throw new AppError('HAS_DEPENDENCIES', 409, Object.fromEntries(preview.blockers.map((b) => [b.kind, String(b.count)])));
}
