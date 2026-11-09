// contact.forget — accept transition (TIP-015c §1.4, §2.1, §2.4): khoá họ khách lại, đối chiếu if_version + inventory_revision với
// đúng những gì đã xem trước (chặn "đổi dữ liệu giữa preview → accept rồi vẫn accept theo bản cũ"), kiểm blocker LẠI (DC-262 — đua với
// tạo đơn/hợp đồng mới), rồi set terminal generation cho CẢ họ + ghi PrivacyOperation + PrivacyFamilyMember trong MỘT transaction.
// Gọi lại cùng request_key (actor + family + generation) → trả operation đã có, không tạo lần hai (idempotent accept).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockFamily } from '../../crm/lifecycle/lock';
import { familyDependencies, assertNoBlockers } from '../../crm/lifecycle/dependencies';
import { familyInventory } from '../../kernel/privacy/provenance';
import { uuidv7 } from '../../kernel/ids';
import { inventoryRevisionOf } from './preview';

export interface AcceptForgetInput {
  contactId: string;
  ifVersion: number;
  inventoryRevision: string;
  requesterId: string;
  policyVersion: number;
  now: Date;
}

export interface AcceptForgetOutcome {
  operationId: string;
  phase: 'accepted';
  /** false = operation đã tồn tại từ trước (gọi lại cùng request_key) — không set lại terminal generation lần hai. */
  created: boolean;
  events: { topic: string; payload: Record<string, unknown> }[];
}

export async function acceptForget(tx: TenantTx, a: AcceptForgetInput): Promise<AcceptForgetOutcome> {
  const fam = await lockFamily(tx, a.contactId);
  const c = fam.root;
  if (c.version !== a.ifVersion) throw new AppError('STALE_VERSION', 409, { if_version: 'stale' });

  // Gọi lại cùng (root, generation) → operation đã có cho family_generation NÀY (unique canonical_contact_id+family_generation).
  const existing = await tx.$queryRaw<{ id: string; phase: string }[]>`
    SELECT "id", "phase" FROM "privacy_operation" WHERE "canonical_contact_id" = ${c.id}::uuid AND "family_generation" = ${c.lifecycleRevision}`;
  if (existing.length) return { operationId: existing[0]!.id, phase: 'accepted', created: false, events: [] };

  // Đối chiếu lại đúng bản đã xem trước — dữ liệu đổi giữa preview → accept (thêm/bớt artifact) → 409, không âm thầm chốt theo bản cũ.
  const inv = await familyInventory(tx, fam.ids);
  const currentRevision = inventoryRevisionOf(inv.artifacts);
  if (currentRevision !== a.inventoryRevision) throw new AppError('CONFLICT', 409, { inventory_revision: 'changed' });
  assertNoBlockers(await familyDependencies(tx, fam.ids));

  const operationId = uuidv7(a.now.getTime());
  const requestKey = `${a.requesterId}:${c.id}:${c.lifecycleRevision}`;
  await tx.$executeRaw`
    INSERT INTO "privacy_operation"
      ("id", "canonical_contact_id", "family_generation", "requester_id", "policy_version", "inventory_revision", "phase", "request_key", "count_total", "created_at", "updated_at")
    VALUES (${operationId}::uuid, ${c.id}::uuid, ${c.lifecycleRevision}, ${a.requesterId}::uuid, ${a.policyVersion}, ${a.inventoryRevision}, 'accepted', ${requestKey}, ${inv.artifacts.length}, ${a.now}, ${a.now})`;
  for (const memberId of fam.ids) {
    await tx.$executeRaw`INSERT INTO "privacy_family_member" ("operation_id", "contact_id", "created_at") VALUES (${operationId}::uuid, ${memberId}::uuid, ${a.now})
      ON CONFLICT DO NOTHING`;
  }

  return {
    operationId,
    phase: 'accepted',
    created: true,
    events: [{ topic: 'contact.privacy_requested', payload: { operation_id: operationId, canonical_contact_id: c.id, family_generation: c.lifecycleRevision, requester_id: a.requesterId } }],
  };
}
