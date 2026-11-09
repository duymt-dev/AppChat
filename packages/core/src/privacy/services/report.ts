// contact.privacy_status (TIP-015c §1.2): đọc tiến độ — chỉ số đếm/pha/version, không nội dung mục nào.
// GET /v1/privacy/operations?cursor&limit (TIP-015c §1.3.2, khai từ pha 1 nhưng chưa cài): danh sách operation của workspace, cùng
// guard privacy.erase/current-membership, cùng hợp đồng không nội dung như contact.privacy_status. Keyset cursor (created_at DESC, id)
// — deferred join: privacy_operation không rộng (không JSON lớn), một bước là đủ, không cần tách truy vấn id trước.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { PrivacyOperationStatus } from '@appchat/shared';

export const PRIVACY_OPERATIONS_PAGE = 30;
export const PRIVACY_OPERATIONS_MAX = 100;

export const encodeOperationCursor = (r: { createdAt: Date; id: string }) => Buffer.from(`${r.createdAt.toISOString()}|${r.id}`).toString('base64url');
export const decodeOperationCursor = (c: string): { at: Date; id: string } => {
  const [at, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  const d = new Date(at ?? '');
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || Number.isNaN(d.getTime())) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  return { at: d, id };
};

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

export interface OperationListItem {
  id: string;
  phase: string;
  canonical_contact_id: string;
  created_at: string;
  updated_at: string;
}

/** Danh sách operation của tenant (DB tenant không có workspace_id — tenant chính là ranh giới). IDs/phase/mốc thời gian chỉ — không
 * nội dung, không counts (đọc từng operation qua contact.privacy_status khi cần chi tiết). */
export async function listPrivacyOperations(tx: TenantTx, a: { cursor?: string; limit?: number }): Promise<{ items: OperationListItem[]; next_cursor: string | null }> {
  const take = Math.min(Math.max(a.limit ?? PRIVACY_OPERATIONS_PAGE, 1), PRIVACY_OPERATIONS_MAX);
  const cur = a.cursor ? decodeOperationCursor(a.cursor) : null;
  const rows = cur
    ? await tx.$queryRaw<{ id: string; phase: string; canonical_contact_id: string; created_at: Date; updated_at: Date }[]>`
        SELECT "id", "phase"::text, "canonical_contact_id", "created_at", "updated_at" FROM "privacy_operation"
        WHERE ("created_at", "id") < (${cur.at}, ${cur.id}::uuid) ORDER BY "created_at" DESC, "id" DESC LIMIT ${take + 1}`
    : await tx.$queryRaw<{ id: string; phase: string; canonical_contact_id: string; created_at: Date; updated_at: Date }[]>`
        SELECT "id", "phase"::text, "canonical_contact_id", "created_at", "updated_at" FROM "privacy_operation" ORDER BY "created_at" DESC, "id" DESC LIMIT ${take + 1}`;
  const page = rows.slice(0, take);
  return {
    items: page.map((r) => ({ id: r.id, phase: r.phase, canonical_contact_id: r.canonical_contact_id, created_at: r.created_at.toISOString(), updated_at: r.updated_at.toISOString() })),
    next_cursor: rows.length > take ? encodeOperationCursor({ createdAt: page[page.length - 1]!.created_at, id: page[page.length - 1]!.id }) : null,
  };
}

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
