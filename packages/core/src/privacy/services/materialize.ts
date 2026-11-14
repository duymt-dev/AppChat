// Vật chất hoá kiểm kê thành privacy_artifact/privacy_subject_link/privacy_item (TIP-015c §2.2.1, pha 2) — chạy MỘT LẦN khi accept,
// cùng transaction với privacy_operation (operation.ts). artifact khoá tại (kind, record_id, revision) — gọi lại idempotent (ON
// CONFLICT DO NOTHING theo khoá kind+record_id+revision; cùng revision thì coi là cùng artifact, không tạo trùng khi nhiều contact
// trong họ cùng thấy một artifact shared).
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import type { DomainArtifact } from '../../kernel/privacy/provenance';

/**
 * Disposition ban đầu theo ownership (TIP-015c §2.3 bảng disposition): `retained_issued` domain tự biết (DC-259, không cần review);
 * `exclusive` tự động `erase_exclusive` (chỉ thuộc một subject — xoá được ngay, không cần người xét); `shared`/`legacy_unbound` để
 * NULL chờ `privacy.review_resolve` (DC-265 cách ly, người quyết `proven_unrelated`/`redact_shared`/`retained_issued`).
 */
function initialDisposition(a: DomainArtifact): 'retained_issued' | 'erase_exclusive' | null {
  if (a.retainedIssued) return 'retained_issued';
  if (a.ownership === 'exclusive') return 'erase_exclusive';
  return null;
}

export async function materializeInventory(tx: TenantTx, operationId: string, familyIds: readonly string[], artifacts: readonly DomainArtifact[], now: Date): Promise<void> {
  for (const a of artifacts) {
    const artifactId = uuidv7(now.getTime());
    const rows = await tx.$queryRaw<{ id: string }[]>`
      INSERT INTO "privacy_artifact" ("id", "domain", "kind", "record_id", "revision", "ownership", "state", "created_at", "updated_at")
      VALUES (${artifactId}::uuid, ${a.domain}, ${a.kind}, ${a.recordId}::uuid, ${a.revision}, ${a.ownership}, 'allowed', ${now}, ${now})
      ON CONFLICT ("kind", "record_id", "revision") DO UPDATE SET "kind" = EXCLUDED."kind"
      RETURNING "id"`;
    const realId = rows[0]!.id;
    for (const contactId of familyIds) {
      await tx.$executeRaw`
        INSERT INTO "privacy_subject_link" ("id", "artifact_id", "contact_id", "generation", "provenance", "created_at")
        VALUES (${uuidv7(now.getTime())}::uuid, ${realId}::uuid, ${contactId}::uuid, 1, ${`inventory:${a.domain}`}, ${now})
        ON CONFLICT ("artifact_id", "contact_id", "generation") DO NOTHING`;
    }
    const disposition = initialDisposition(a);
    await tx.$executeRaw`
      INSERT INTO "privacy_item" ("id", "operation_id", "artifact_id", "disposition", "resolved_at", "created_at", "updated_at")
      VALUES (${uuidv7(now.getTime())}::uuid, ${operationId}::uuid, ${realId}::uuid, ${disposition}::privacy_item_disposition, ${disposition ? now : null}, ${now}, ${now})
      ON CONFLICT ("operation_id", "artifact_id") DO NOTHING`;
  }
}
