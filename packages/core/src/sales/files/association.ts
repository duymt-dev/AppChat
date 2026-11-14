// Liên kết tệp đính kèm bản ghi bán hàng (TIP-032d §1.3–1.5, §4.1) — lõi chung của đơn / đề nghị, mỗi loại cha một adapter mỏng (bảng
// riêng, quyền riêng). Thứ tự khoá: khách gốc → cha (FOR UPDATE, quyền GHI hiện hành) → bộ tệp của cha (revision) → giành tệp (file_claim,
// chốt bền một-chủ) → liên kết. Gắn tiêu thụ staging (đã kiểm cấu trúc, đúng digest / validator_version), xác nhận tệp; gỡ chỉ đánh dấu
// `detached_at` — không xoá blob, không đụng tiền / trạng thái / version của cha, không đụng PDF / phiếu thu đã sinh.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { claimFile } from '../../kernel/files/file-claims';

export type ParentType = 'order' | 'invoice';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AttachmentRecord {
  id: string;
  fileId: string;
  createdBy: string | null;
  createdAt: Date;
  version: number;
  detachedAt: Date | null;
}

/** Bảng liên kết của một loại cha — adapter domain (orders/files, payments/files) cài. */
export interface AttachmentTable {
  type: ParentType;
  find(tx: TenantTx, id: string): Promise<(AttachmentRecord & { parentId: string }) | null>;
  live(tx: TenantTx, parentId: string, fileId: string): Promise<AttachmentRecord | null>;
  create(tx: TenantTx, row: { id: string; parentId: string; fileId: string; createdBy: string | null; createdAt: Date }): Promise<void>;
  /** Đánh dấu gỡ có CAS version — trả số dòng (0 = version lệch / đã gỡ). */
  detach(tx: TenantTx, id: string, version: number, by: string | null, now: Date): Promise<number>;
  holds(tx: TenantTx, fileId: string): Promise<boolean>;
}

/** Khoá bộ tệp của cha + so revision (lệch → 409 STALE). Trả revision hiện tại. */
export async function lockSet(tx: TenantTx, type: ParentType, parentId: string, ifRevision: number | null): Promise<number> {
  await tx.$executeRaw`INSERT INTO record_attachment_state (parent_type, parent_id) VALUES (${type}, ${parentId}::uuid) ON CONFLICT DO NOTHING`;
  const [row] = await tx.$queryRaw<{ revision: number }[]>`SELECT revision FROM record_attachment_state WHERE parent_type = ${type} AND parent_id = ${parentId}::uuid FOR UPDATE`;
  const rev = row?.revision ?? 0;
  if (ifRevision !== null && ifRevision !== rev) throw new AppError('STALE_VERSION', 409, { if_revision: 'changed' });
  return rev;
}

export async function bumpSet(tx: TenantTx, type: ParentType, parentId: string, now: Date): Promise<number> {
  const [row] = await tx.$queryRaw<{ revision: number }[]>`
    UPDATE record_attachment_state SET revision = revision + 1, updated_at = ${now} WHERE parent_type = ${type} AND parent_id = ${parentId}::uuid RETURNING revision`;
  return row!.revision;
}

export async function setRevision(tx: Pick<TenantTx, 'recordAttachmentState'>, type: ParentType, parentId: string): Promise<number> {
  return (await tx.recordAttachmentState.findUnique({ where: { parentType_parentId: { parentType: type, parentId } } }))?.revision ?? 0;
}

export { stagedFor } from '../../kernel/files/attachment-targets';

/**
 * Gắn một tệp đã kiểm (staging) vào cha — người gọi ĐÃ khoá khách gốc + cha và kiểm quyền GHI. Liên kết sống sẵn cho đúng cha → biên nhận
 * cũ (`reused`), không tăng revision. Tệp đã thuộc cha khác → 409 (claim).
 */
export async function attachStaged(tx: TenantTx, t: AttachmentTable, a: { parentId: string; fileId: string; userId: string | null; ifRevision: number; now: Date }) {
  const existing = await t.live(tx, a.parentId, a.fileId);
  const rev = await lockSet(tx, t.type, a.parentId, existing ? null : a.ifRevision);
  if (existing) return { attachment_id: existing.id, file_id: a.fileId, version: existing.version, revision: rev, reused: true };
  const id = uuidv7(a.now.getTime());
  const claim = await claimFile(tx, { fileId: a.fileId, parentType: t.type, parentId: a.parentId, associationId: id, revision: rev + 1, now: a.now });
  // Claim cũ của chính cha này (liên kết đã gỡ trước đó) → tệp không gắn lại được bằng handle cũ: cần tải mới (không mở rộng handle).
  if (!claim.created) throw new AppError('CONFLICT', 409, { file: 'claimed' });
  await t.create(tx, { id, parentId: a.parentId, fileId: a.fileId, createdBy: a.userId, createdAt: a.now });
  await tx.attachmentStaging.delete({ where: { fileId: a.fileId } });
  await tx.file.update({ where: { id: a.fileId }, data: { confirmed: true } });
  const revision = await bumpSet(tx, t.type, a.parentId, a.now);
  return { attachment_id: id, file_id: a.fileId, version: 1, revision, reused: false };
}

/** Gỡ một liên kết (CAS version) — người gọi đã khoá + kiểm quyền GHI cha. Liên kết khác cha / đã gỡ → 404 / 409. */
export async function detachOne(tx: TenantTx, t: AttachmentTable, a: { parentId: string; attachmentId: string; ifVersion: number; userId: string | null; now: Date }) {
  const row = UUID.test(a.attachmentId) ? await t.find(tx, a.attachmentId) : null;
  if (!row || row.parentId !== a.parentId) throw new AppError('NOT_FOUND', 404, { attachment_id: 'not_found' });
  await lockSet(tx, t.type, a.parentId, null);
  if (row.detachedAt) throw new AppError('CONFLICT', 409, { attachment_id: 'detached' });
  if (!(await t.detach(tx, row.id, a.ifVersion, a.userId, a.now))) throw new AppError('STALE_VERSION', 409, { if_version: 'changed' });
  const revision = await bumpSet(tx, t.type, a.parentId, a.now);
  return { attachment_id: row.id, file_id: row.fileId, revision };
}

export interface FileRowOut {
  attachment_id: string | null;
  file_id: string;
  name: string;
  mime: string;
  bytes: number;
  created_at: string;
  created_by: string | null;
  kind: 'user_attachment' | 'generated_invoice' | 'generated_receipt';
  version: number | null;
  available: boolean;
  can_detach: boolean;
}

export const LIST_DEFAULT = 20;
export const LIST_MAX = 50;

const cursorOf = (at: Date, id: string) => Buffer.from(`${at.toISOString()}|${id}`).toString('base64url');
function decode(c: string): { at: Date; id: string } {
  const [a, id] = Buffer.from(c, 'base64url').toString().split('|');
  const at = new Date(a ?? '');
  if (!id || !UUID.test(id) || Number.isNaN(at.getTime())) throw new AppError('VALIDATION_FAILED', 422, { cursor: 'invalid' });
  return { at, id };
}

/**
 * Trang liên kết sống của một cha: id trước theo `(created_at DESC, id DESC)` (index một phần `*_attachment_list_idx`), LIMIT n+1; rồi nạp
 * metadata tệp một lượt cho đúng các id đã chọn (không N+1, không đọc tệp của dòng bị loại). Không storage key / URL.
 */
export async function listPage(tx: TenantTx, table: 'order_attachment' | 'invoice_attachment', parentId: string, q: { limit?: number; cursor?: string }, canDetach: boolean) {
  const limit = Math.min(Math.max(q.limit ?? LIST_DEFAULT, 1), LIST_MAX);
  const after = q.cursor ? decode(q.cursor) : null;
  const col = table === 'order_attachment' ? 'order_id' : 'invoice_id';
  const ids = await tx.$queryRawUnsafe<{ id: string; file_id: string; version: number; created_by: string | null; created_at: Date }[]>(
    `SELECT id, file_id, version, created_by, created_at FROM ${table}
      WHERE ${col} = $1::uuid AND detached_at IS NULL ${after ? 'AND (created_at, id) < ($2::timestamptz, $3::uuid)' : ''}
      ORDER BY created_at DESC, id DESC LIMIT ${limit + 1}`,
    parentId,
    ...(after ? [after.at, after.id] : []),
  );
  const page = ids.slice(0, limit);
  const files = new Map((page.length ? await tx.file.findMany({ where: { id: { in: page.map((r) => r.file_id) } }, select: { id: true, name: true, mime: true, size: true } }) : []).map((f) => [f.id, f]));
  const rows: FileRowOut[] = page.map((r) => {
    const f = files.get(r.file_id);
    return { attachment_id: r.id, file_id: r.file_id, name: f?.name ?? '', mime: f?.mime ?? '', bytes: Number(f?.size ?? 0), created_at: r.created_at.toISOString(), created_by: r.created_by, kind: 'user_attachment', version: r.version, available: !!f, can_detach: canDetach };
  });
  const last = page.at(-1);
  return { rows, next_cursor: ids.length > limit && last ? cursorOf(last.created_at, last.id) : null };
}
