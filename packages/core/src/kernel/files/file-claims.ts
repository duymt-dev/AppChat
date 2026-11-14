// Giành tệp một-chủ trung lập (TIP-032d §1.4, §2.4, §2.6): tệp `record_attachment` thuộc đúng MỘT cha (loại + id) — chèn `file_claim`
// (PK file_id) là chốt bền chống gắn chéo, kể cả giữa hai bảng liên kết khác domain. Kernel không import domain: domain đăng ký adapter
// nguồn (loại cha → kiểm quyền đọc hiện hành + tìm liên kết sống) để route tải tệp / dọn tệp hỏi domain mà không biết bảng của nó.
import type { AuthzContext } from '@appchat/shared';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../actions/action-context';

export const RECORD_ATTACHMENT = 'record_attachment';

/** Giành tệp cho một cha. Đã giành cho đúng cha này → trả claim cũ; cha khác → 409 (không gắn chéo, không lộ cha kia). */
export async function claimFile(tx: TenantTx, c: { fileId: string; parentType: string; parentId: string; associationId: string; revision: number; now: Date }): Promise<{ associationId: string; created: boolean }> {
  const n = await tx.$executeRaw`
    INSERT INTO file_claim (file_id, parent_type, parent_id, association_id, revision, created_at)
    VALUES (${c.fileId}::uuid, ${c.parentType}, ${c.parentId}::uuid, ${c.associationId}::uuid, ${c.revision}, ${c.now})
    ON CONFLICT (file_id) DO NOTHING`;
  if (n) return { associationId: c.associationId, created: true };
  const cur = await tx.fileClaim.findUnique({ where: { fileId: c.fileId } });
  if (!cur || cur.parentType !== c.parentType || cur.parentId !== c.parentId) throw new AppError('CONFLICT', 409, { file: 'claimed' });
  return { associationId: cur.associationId, created: false };
}

/** Adapter nguồn của một loại cha (domain đăng ký): kiểm cha còn đọc được theo quyền hiện hành + tệp có liên kết SỐNG với cha. */
export interface RecordFileSource {
  parentType: string;
  /** Tệp `fileId` có liên kết sống với cha `parentId` mà người xem còn đọc được — sai bất kỳ điều kiện → false (route trả 404 đồng nhất). */
  canRead(tx: TenantTx, authz: AuthzContext, parentId: string, fileId: string): Promise<boolean>;
  /** Còn liên kết sống nào giữ tệp (dọn tệp mồ côi không được xoá). */
  holds(tx: TenantTx, fileId: string): Promise<boolean>;
}

const sources = new Map<string, RecordFileSource>();

export function registerRecordFileSource(s: RecordFileSource): void {
  sources.set(s.parentType, s);
}

export function recordFileSource(parentType: string): RecordFileSource | undefined {
  return sources.get(parentType);
}

/**
 * Tệp đã giành cho bản ghi: người xem đọc được khi và chỉ khi adapter của loại cha cho phép (quyền cha hiện hành + liên kết sống). Người
 * tải lên / Owner / kb.manage KHÔNG còn là đường tắt sau khi tệp thuộc bản ghi. `null` = tệp không thuộc bản ghi nào (route giữ luật cũ).
 */
export async function claimedFileAccess(tx: TenantTx, authz: AuthzContext, fileId: string): Promise<boolean | null> {
  const c = await tx.fileClaim.findUnique({ where: { fileId } });
  if (!c) return null;
  const s = sources.get(c.parentType);
  return s ? s.canRead(tx, authz, c.parentId, fileId) : false;
}

/** Tệp private không được mở qua link ký công khai: đã giành cho bản ghi, hoặc đang staging đính kèm bản ghi. */
export async function isPrivateRecordFile(tx: Pick<TenantTx, 'fileClaim' | 'attachmentStaging'>, fileId: string): Promise<boolean> {
  const [c, s] = await Promise.all([tx.fileClaim.findUnique({ where: { fileId }, select: { fileId: true } }), tx.attachmentStaging.findUnique({ where: { fileId }, select: { fileId: true } })]);
  return !!(c || s);
}
