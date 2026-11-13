// Sao chép tệp người dùng đưa cho Trợ lý vào bản ghi, có đồng ý (TIP-032d §3.3): nguồn qua registry trung lập của kernel (sales không import
// AI). Sau xác nhận + NGOÀI transaction: kiểm lại nguồn + quyền ghi đích → tạo tệp MỚI riêng tư purpose `record_attachment` gắn đúng đích
// (cùng bytes gốc, digest khớp) với id TẤT ĐỊNH theo thao tác → staging → kiểm cấu trúc như đường tải tay. Chạy lại cùng thao tác (crash /
// gửi lại) trúng đúng tệp + staging cũ — không sao chép trùng. Artifact gốc (purpose / phiên) không đổi; bản sao lỗi ở lại staging riêng tư
// (dọn như tệp mồ côi). Đích khác / revision khác / người khác → id khác (không dùng lại bản sao của đích cũ).
import { createHash } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { attachmentSource, type OriginalLocator } from '../../kernel/files/attachment-source-registry';
import { RECORD_ATTACHMENT } from '../../kernel/files/file-claims';
import type { FilesService } from '../../kernel/files/files.service';
import type { ParentType } from './association';

export type ArtifactRef = { kind: 'assistant_artifact_ref'; artifact_id: string; revision: number };
type SourceDb = Pick<TenantTx, 'assistantInputArtifact' | 'aiRun' | 'file'>;

/** Nguồn hiện hành (người ra lệnh + phiên của run) → bộ định vị bytes gốc. Nguồn thu hồi / lệch revision → lỗi có kiểu từ adapter. */
export const locateSource = (db: SourceDb, userId: string, runId: string | undefined, s: ArtifactRef): Promise<OriginalLocator> =>
  attachmentSource(s.kind).locate(db, { userId, ...(runId ? { runId } : {}), ref: { kind: s.kind, id: s.artifact_id, revision: s.revision } });

/** Dữ kiện ràng vào xác nhận: đúng artifact + revision + digest gốc (nguồn đổi giữa xem trước và chạy → xem trước lại). */
export const sourceFact = (s: ArtifactRef, digest: string) => ({ source: `${s.artifact_id}:${s.revision}:${digest}` });

/** Id tệp bản sao (UUID dạng v8) tất định theo (người, đích, artifact, revision, digest, khoá thao tác). */
export function copyIdOf(a: { userId: string; parentType: ParentType; parentId: string; source: ArtifactRef; digest: string; operation: string }): string {
  const h = createHash('sha256').update(['record-copy', a.userId, a.parentType, a.parentId, a.source.artifact_id, a.source.revision, a.digest, a.operation].join('\n')).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const isUnique = (e: unknown) => (e as { code?: string })?.code === 'P2002';

/** Tệp của liên kết SỐNG trên cha có cùng digest (đã gắn bản sao của nguồn này) — gửi lại / model gọi lặp → biên nhận cũ, không chép thêm. */
export async function liveFileByDigest(tx: TenantTx, table: 'order_attachment' | 'invoice_attachment', parentId: string, digest: string): Promise<string | null> {
  const col = table === 'order_attachment' ? 'order_id' : 'invoice_id';
  const [row] = await tx.$queryRawUnsafe<{ file_id: string }[]>(
    `SELECT a.file_id FROM ${table} a JOIN file f ON f.id = a.file_id WHERE a.${col} = $1::uuid AND a.detached_at IS NULL AND f.sha256 = $2 ORDER BY a.created_at LIMIT 1`,
    parentId,
    digest,
  );
  return row?.file_id ?? null;
}

/**
 * Tạo (hoặc gặp lại) bản sao riêng tư cho đích. `checkTarget` kiểm đích đọc + ghi được (cùng transaction với kiểm nguồn); `reuse` trả tệp
 * đã gắn sống cùng digest (không sao chép — execute trả biên nhận cũ). Bản sao đã gắn (claim có) → không tạo lại staging.
 */
export async function copyArtifact(
  db: TenantDb,
  files: FilesService,
  a: {
    ws: string;
    userId: string;
    runId?: string;
    operation: string;
    source: ArtifactRef;
    parentType: ParentType;
    parentId: string;
    checkTarget: (tx: TenantTx) => Promise<void>;
    reuse: (tx: TenantTx, digest: string) => Promise<string | null>;
  },
): Promise<string> {
  const [loc, live] = await db.$transaction(async (tx) => {
    await a.checkTarget(tx);
    const l = await locateSource(tx, a.userId, a.runId, a.source);
    return [l, await a.reuse(tx, l.digest)] as const;
  });
  if (live) return live;
  const id = copyIdOf({ ...a, digest: loc.digest });
  const have = await db.file.findUnique({ where: { id }, select: { sha256: true } });
  if (have) {
    if (have.sha256 !== loc.digest) throw new AppError('CONFLICT', 409, { source: 'copy_mismatch' });
    if (await db.fileClaim.findUnique({ where: { fileId: id }, select: { fileId: true } })) return id;
  } else {
    const src = await files.read(db, loc.fileId);
    if (!src || src.row.sha256 !== loc.digest) throw new AppError('NOT_FOUND', 404, { source: 'unavailable' });
    // Cổng tải lên của purpose record_attachment áp lại danh sách cho phép (HTML / EML / thực thi → 415) — nhánh artifact không đi vòng.
    await files.upload(db, a.ws, { id, name: loc.name, mime: src.row.mime, body: src.body, purpose: RECORD_ATTACHMENT, uploadedBy: a.userId }).catch((e) => {
      if (!isUnique(e)) throw e; // lượt song song cùng thao tác đã tạo
    });
  }
  await db.attachmentStaging.createMany({ data: [{ fileId: id, uploadedBy: a.userId, parentType: a.parentType, parentId: a.parentId, digest: loc.digest }], skipDuplicates: true });
  return id;
}
