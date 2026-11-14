// privacy.review_resolve (TIP-015c §1.3 point 5, §2.3, pha 2) — người xét quyết định MỘT privacy_item đang quarantine (DC-265
// shared/legacy_unbound chưa rõ chủ thể). Optimistic lock theo `version` của item; sai → 409 STALE_VERSION (không âm thầm ghi đè
// quyết định khác). Không cho đổi lại mục đã resolved (resolved_at NOT NULL) — mỗi mục quyết đúng một lần, muốn đổi phải mở lại qua
// verifier (pha sau §2.7), không qua action này.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export interface ReviewResolveInput {
  operationId: string;
  itemId: string;
  ifVersion: number;
  disposition: 'proven_unrelated' | 'erase_exclusive' | 'redact_shared' | 'retained_issued';
  proofRef?: string;
}

export interface ReviewResolvePreview {
  operationId: string;
  itemId: string;
  domain: string;
  kind: string;
  ownership: string;
}

type ItemRow = { id: string; version: number; disposition: string | null; domain: string; kind: string; ownership: string };

async function loadItem(tx: TenantTx, operationId: string, itemId: string): Promise<ItemRow> {
  const [row] = await tx.$queryRaw<ItemRow[]>`
    SELECT i."id", i."version", i."disposition"::text AS disposition, a."domain", a."kind", a."ownership"
    FROM "privacy_item" i JOIN "privacy_artifact" a ON a."id" = i."artifact_id"
    WHERE i."operation_id" = ${operationId}::uuid AND i."id" = ${itemId}::uuid`;
  if (!row) throw new AppError('NOT_FOUND', 404, { item_id: 'not_found' });
  return row;
}

export async function reviewResolvePreview(tx: TenantTx, operationId: string, itemId: string): Promise<ReviewResolvePreview> {
  const row = await loadItem(tx, operationId, itemId);
  if (row.disposition) throw new AppError('CONFLICT', 409, { item_id: 'already_resolved' });
  return { operationId, itemId: row.id, domain: row.domain, kind: row.kind, ownership: row.ownership };
}

/** `proven_unrelated`/`retained_issued` không cần xoá gì thêm — đánh resolved_at NGAY; `erase_exclusive`/`redact_shared` còn chờ
 * cleanup_step gọi adapter.erase() thật rồi mới resolved_at (cleanup.ts eraseBatch). */
const TERMINAL_WITHOUT_ERASE = new Set(['proven_unrelated', 'retained_issued']);

export async function reviewResolve(tx: TenantTx, a: ReviewResolveInput, now: Date): Promise<{ itemId: string; disposition: string }> {
  const row = await loadItem(tx, a.operationId, a.itemId);
  if (row.version !== a.ifVersion) throw new AppError('STALE_VERSION', 409, { if_version: 'stale' });
  if (row.disposition) throw new AppError('CONFLICT', 409, { item_id: 'already_resolved' });
  const resolvedNow = TERMINAL_WITHOUT_ERASE.has(a.disposition);
  await tx.$executeRaw`
    UPDATE "privacy_item" SET "disposition" = ${a.disposition}::privacy_item_disposition, "proof_ref" = ${a.proofRef ?? null}, "version" = "version" + 1,
      "resolved_at" = ${resolvedNow ? now : null}, "updated_at" = ${now}
    WHERE "id" = ${row.id}::uuid AND "version" = ${a.ifVersion}`;
  return { itemId: row.id, disposition: a.disposition };
}
