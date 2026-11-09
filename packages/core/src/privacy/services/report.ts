// contact.privacy_status (TIP-015c §1.2): đọc tiến độ — chỉ số đếm/pha/version, không nội dung mục nào.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { PrivacyOperationStatus } from '@appchat/shared';

type Row = {
  id: string;
  phase: string;
  policy_version: number;
  count_total: number;
  count_resolved: number;
  count_retained: number;
  created_at: Date;
  updated_at: Date;
};

export async function privacyOperationStatus(tx: TenantTx, operationId: string): Promise<PrivacyOperationStatus> {
  const [row] = await tx.$queryRaw<Row[]>`
    SELECT "id", "phase"::text, "policy_version", "count_total", "count_resolved", "count_retained", "created_at", "updated_at"
    FROM "privacy_operation" WHERE "id" = ${operationId}::uuid`;
  if (!row) throw new AppError('NOT_FOUND', 404, { operation_id: 'not_found' });
  const retainedRows = await tx.$queryRaw<{ kind: string }[]>`
    SELECT DISTINCT a."kind" FROM "privacy_item" i JOIN "privacy_artifact" a ON a."id" = i."artifact_id"
    WHERE i."operation_id" = ${operationId}::uuid AND i."disposition" = 'retained_issued'`;
  const unresolved = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "privacy_item" WHERE "operation_id" = ${operationId}::uuid AND "disposition" IS NULL LIMIT 100`;
  return {
    id: row.id,
    phase: row.phase as PrivacyOperationStatus['phase'],
    version: row.policy_version,
    counts: { total: row.count_total, resolved: row.count_resolved, retained: row.count_retained },
    retained_categories: retainedRows.map((r) => r.kind),
    unresolved_item_ids: unresolved.map((r) => r.id),
    progress: row.count_total > 0 ? row.count_resolved / row.count_total : 0,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
