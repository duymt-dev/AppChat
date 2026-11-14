// Kiểm kê họ khách qua 13 adapter (TIP-015c §2.2, mirror crm/lifecycle/dependencies.ts familyDependencies). Thiếu adapter → 503.
import type { TenantTx } from '../actions/action-context';
import type { InventoryArtifact, PrivacyDomain } from './types';
import { privacyAdapters } from './registry';

/** Artifact kèm domain đã kiểm kê nó (TIP-015c pha 2) — digest preview vẫn dùng {kind,recordId,revision} thuần (không đổi chữ ký cũ). */
export type DomainArtifact = InventoryArtifact & { domain: PrivacyDomain };

export interface FamilyInventory {
  artifacts: DomainArtifact[];
  removableCount: number;
  sharedCount: number;
  retainedCount: number;
}

/** Gom kiểm kê mọi domain cho họ khách — phân loại đếm cho preview (không id cụ thể ra ngoài), gắn domain nguồn cho cleanup pha 2. */
export async function familyInventory(tx: TenantTx, contactIds: readonly string[]): Promise<FamilyInventory> {
  const artifacts: DomainArtifact[] = [];
  for (const a of privacyAdapters()) for (const art of await a.inventory(tx, contactIds)) artifacts.push({ ...art, domain: a.domain });
  let removableCount = 0;
  let sharedCount = 0;
  let retainedCount = 0;
  for (const a of artifacts) {
    if (a.retainedIssued) retainedCount++;
    else if (a.ownership === 'exclusive') removableCount++;
    else sharedCount++;
  }
  return { artifacts, removableCount, sharedCount, retainedCount };
}
