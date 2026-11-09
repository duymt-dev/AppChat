// Kiểm kê họ khách qua 13 adapter (TIP-015c §2.2, mirror crm/lifecycle/dependencies.ts familyDependencies). Thiếu adapter → 503.
import type { TenantTx } from '../actions/action-context';
import type { InventoryArtifact } from './types';
import { privacyAdapters } from './registry';

export interface FamilyInventory {
  artifacts: InventoryArtifact[];
  removableCount: number;
  sharedCount: number;
  retainedCount: number;
}

/** Gom kiểm kê mọi domain cho họ khách — phân loại đếm cho preview (không id cụ thể ra ngoài). */
export async function familyInventory(tx: TenantTx, contactIds: readonly string[]): Promise<FamilyInventory> {
  const artifacts: InventoryArtifact[] = [];
  for (const a of privacyAdapters()) artifacts.push(...(await a.inventory(tx, contactIds)));
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
