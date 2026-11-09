// contact.forget — accept transition (TIP-015c §1.4, §2.1, §2.4): khoá họ khách lại, đối chiếu if_version + inventory_revision với
// đúng những gì đã xem trước (chặn "đổi dữ liệu giữa preview → accept rồi vẫn accept theo bản cũ"), kiểm blocker LẠI (DC-262 — đua với
// tạo đơn/hợp đồng mới), rồi set terminal generation cho CẢ họ + ghi PrivacyOperation + PrivacyFamilyMember trong MỘT transaction.
// Gọi lại cùng request_key (actor + family + generation) → trả operation đã có, không tạo lần hai (idempotent accept).
// `operationId` truyền từ handler (pha 3): journal nền tảng (journal.ts) reserve TRƯỚC khi gọi hàm này — cần ID tất định trước khi mở
// transaction tenant, không sinh ở đây nữa (mirror 045b annex A1 "id tenant phải tất định, sinh ở pha nền tảng").
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockFamily } from '../../crm/lifecycle/lock';
import { familyDependencies, assertNoBlockers } from '../../crm/lifecycle/dependencies';
import { familyInventory } from '../../kernel/privacy/provenance';
import { inventoryRevisionOf } from './preview';
import { materializeInventory } from './materialize';
import { tombstoneIdentities } from './recreation';

export interface AcceptForgetInput {
  /** Sinh trước ở handler (uuidv7) — journal reserve dùng ID này trước khi mở transaction tenant. */
  operationId: string;
  contactId: string;
  ifVersion: number;
  inventoryRevision: string;
  requesterId: string;
  policyVersion: number;
  now: Date;
  /** APP_ENC_KEY (DI ở handler) — tombstone định danh cần khoá mở `privacy_keyring`. Thiếu → 503 (xem tombstoneIdentities). */
  encKey?: Buffer | null;
}

export interface AcceptForgetOutcome {
  operationId: string;
  phase: 'accepted';
  /** false = operation đã tồn tại từ trước (gọi lại cùng request_key) — không set lại terminal generation lần hai, không journal mới. */
  created: boolean;
  canonicalContactId: string;
  familyGeneration: number;
  familyIds: string[];
  events: { topic: string; payload: Record<string, unknown> }[];
}

export async function acceptForget(tx: TenantTx, a: AcceptForgetInput): Promise<AcceptForgetOutcome> {
  const fam = await lockFamily(tx, a.contactId);
  const c = fam.root;
  if (c.version !== a.ifVersion) throw new AppError('STALE_VERSION', 409, { if_version: 'stale' });

  // Gọi lại cùng (root, generation) → operation đã có cho family_generation NÀY (unique canonical_contact_id+family_generation).
  const existing = await tx.$queryRaw<{ id: string; phase: string }[]>`
    SELECT "id", "phase" FROM "privacy_operation" WHERE "canonical_contact_id" = ${c.id}::uuid AND "family_generation" = ${c.lifecycleRevision}`;
  if (existing.length) return { operationId: existing[0]!.id, phase: 'accepted', created: false, canonicalContactId: c.id, familyGeneration: c.lifecycleRevision, familyIds: fam.ids, events: [] };

  // Đối chiếu lại đúng bản đã xem trước — dữ liệu đổi giữa preview → accept (thêm/bớt artifact) → 409, không âm thầm chốt theo bản cũ.
  const inv = await familyInventory(tx, fam.ids);
  const currentRevision = inventoryRevisionOf(inv.artifacts);
  if (currentRevision !== a.inventoryRevision) throw new AppError('CONFLICT', 409, { inventory_revision: 'changed' });
  assertNoBlockers(await familyDependencies(tx, fam.ids));

  const operationId = a.operationId;
  const requestKey = `${a.requesterId}:${c.id}:${c.lifecycleRevision}`;
  await tx.$executeRaw`
    INSERT INTO "privacy_operation"
      ("id", "canonical_contact_id", "family_generation", "requester_id", "policy_version", "inventory_revision", "phase", "request_key", "count_total", "created_at", "updated_at")
    VALUES (${operationId}::uuid, ${c.id}::uuid, ${c.lifecycleRevision}, ${a.requesterId}::uuid, ${a.policyVersion}, ${a.inventoryRevision}, 'accepted', ${requestKey}, ${inv.artifacts.length}, ${a.now}, ${a.now})`;
  for (const memberId of fam.ids) {
    await tx.$executeRaw`INSERT INTO "privacy_family_member" ("operation_id", "contact_id", "created_at") VALUES (${operationId}::uuid, ${memberId}::uuid, ${a.now})
      ON CONFLICT DO NOTHING`;
  }
  // Vật chất hoá kiểm kê thành artifact/subject-link/item (TIP-015c pha 2) — cùng transaction, cursor của cleanup_step bắt đầu từ đây.
  await materializeInventory(tx, operationId, fam.ids, inv.artifacts, a.now);
  // Tombstone định danh (TIP-015c §4.1, pha 3) — chặn tự tái tạo từ cùng SĐT/email sau khi quên (DC-260). Thiếu khoá → fail closed
  // (không coi "chưa tombstone được" là an toàn) — ném trước khi tenant tx commit, rollback cả accept.
  await tombstoneIdentities(tx, fam.ids, a.now, a.encKey);

  return {
    operationId,
    phase: 'accepted',
    created: true,
    canonicalContactId: c.id,
    familyGeneration: c.lifecycleRevision,
    familyIds: fam.ids,
    events: [{ topic: 'contact.privacy_requested', payload: { operation_id: operationId, canonical_contact_id: c.id, family_generation: c.lifecycleRevision, requester_id: a.requesterId } }],
  };
}
