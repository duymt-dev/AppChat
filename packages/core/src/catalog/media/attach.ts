// Gắn media sản phẩm (TIP-027b §1.1–1.4, §2.3): `prepare` NGOÀI transaction (sau xác nhận) — ghi ý định bền dưới khoá sản phẩm TRƯỚC khi
// chép bytes / kiểm cấu trúc (hoàn tác tạo sản phẩm thấy và từ chối), artifact Trợ lý → bản sao riêng của sản phẩm (kernel artifact-copy)
// → kiểm cấu trúc hồ sơ `product` trong tiến trình cô lập. `attach` trong transaction: khoá sản phẩm (sống) → kiểm lại nguồn (artifact) →
// bộ media (CAS) → giành tệp → liên kết; ảnh đầu tiên thành ảnh chính; xoá ý định. Loại media suy từ kiểu đã kiểm, không tin client.
import { randomUUID } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { assertBoundPreview } from '../../kernel/actions/preview-binding';
import { uuidv7 } from '../../kernel/ids';
import { claimFile } from '../../kernel/files/file-claims';
import { stagedFor, validateStaged } from '../../kernel/files/attachment-targets';
import { copyArtifact, locateSource, sourceFact, type ArtifactRef } from '../../kernel/files/artifact-copy';
import type { FilesService } from '../../kernel/files/files.service';
import { IMAGE_KINDS } from '../../kernel/files/attachment-validator-entry';
import { MEDIA_LIMITS, bumpMedia, liveByFile, lockMedia, lockProduct, nextSlot, primaryOf, type MediaKind } from './repository';

export const PRODUCT = 'product';
export type MediaSource = { kind: 'target_upload_handle'; file_id: string } | ArtifactRef;
export type AttachIn = { product_id: string; source: MediaSource; if_version: number };
export type Prepared = { fileId: string; digest?: string; operation: string };

const COPY_UNAVAILABLE = () => new AppError('VALIDATION_FAILED', 422, { source: 'artifact_copy_unavailable' });
export const operationOf = (ctx: ActionContext) => ctx.idempotencyKey ?? ctx.confirmToken ?? randomUUID();

/** Ý định gắn đang chuẩn bị — ghi dưới khoá sản phẩm (sản phẩm đã bị hoàn tác tạo → 404, không chép bytes về đích đã xoá). */
async function registerIntent(db: TenantDb, a: { productId: string; operation: string; userId: string; fileId?: string }) {
  await db.$transaction(async (tx) => {
    await lockProduct(tx, a.productId);
    await tx.$executeRaw`INSERT INTO product_media_intent (operation_id, product_id, file_id, created_by) VALUES (${a.operation}, ${a.productId}::uuid, ${a.fileId ?? null}::uuid, ${a.userId}::uuid)
      ON CONFLICT (product_id, operation_id) DO UPDATE SET file_id = COALESCE(EXCLUDED.file_id, product_media_intent.file_id)`;
  });
}

export async function prepareAttach(db: TenantDb, files: FilesService, ctx: ActionContext, userId: string, i: AttachIn, now: () => Date, checkWritable: (tx: TenantTx) => Promise<void>): Promise<Prepared> {
  const operation = operationOf(ctx);
  if (i.source.kind === 'target_upload_handle') {
    await registerIntent(db, { productId: i.product_id, operation, userId, fileId: i.source.file_id });
    await validateStaged(db, files, i.source.file_id, now);
    return { fileId: i.source.file_id, operation };
  }
  const source = i.source;
  await registerIntent(db, { productId: i.product_id, operation, userId });
  const fileId = await copyArtifact(db, files, {
    ws: ctx.workspaceId, userId, ...(ctx.runId ? { runId: ctx.runId } : {}), operation, source, parentType: PRODUCT, parentId: i.product_id,
    checkTarget: checkWritable,
    reuse: async (tx, digest) => (await tx.$queryRaw<{ file_id: string }[]>`
      SELECT m.file_id FROM product_media m JOIN file f ON f.id = m.file_id WHERE m.product_id = ${i.product_id}::uuid AND m.detached_at IS NULL AND f.sha256 = ${digest} LIMIT 1`)[0]?.file_id ?? null,
  });
  await registerIntent(db, { productId: i.product_id, operation, userId, fileId });
  await validateStaged(db, files, fileId, now);
  const f = await db.file.findUnique({ where: { id: fileId }, select: { sha256: true } });
  return { fileId, digest: f?.sha256 ?? '', operation };
}

export async function attachMedia(ctx: ActionContext, tx: TenantTx, userId: string, i: AttachIn, p: Prepared | undefined, now: Date) {
  const fileId = i.source.kind === 'target_upload_handle' ? i.source.file_id : p?.fileId;
  if (!fileId) throw COPY_UNAVAILABLE();
  await lockProduct(tx, i.product_id);
  if (i.source.kind === 'assistant_artifact_ref') {
    const loc = await locateSource(tx, userId, ctx.runId, i.source);
    assertBoundPreview(ctx.previewFacts, sourceFact(i.source, loc.digest));
    if (loc.digest !== p?.digest) throw new AppError('CONFLICT', 409, { source: 'changed' });
  }
  const existing = await liveByFile(tx, i.product_id, fileId);
  const version = await lockMedia(tx, i.product_id, existing ? null : i.if_version);
  if (p) await tx.productMediaIntent.deleteMany({ where: { productId: i.product_id, operationId: p.operation } });
  if (existing) return { media_id: existing.id, file_id: fileId, kind: existing.kind as MediaKind, version, primary_id: await primaryOf(tx, i.product_id), reused: true };
  const s = await stagedFor(tx, { fileId, userId, type: PRODUCT, parentId: i.product_id });
  const kind: MediaKind = IMAGE_KINDS.includes(s.kind as never) ? 'image' : 'document';
  const slot = await nextSlot(tx, i.product_id, kind);
  if (slot.count >= MEDIA_LIMITS[kind]) throw new AppError('VALIDATION_FAILED', 422, { [kind]: 'limit_reached' });
  const id = uuidv7(now.getTime());
  const claim = await claimFile(tx, { fileId, parentType: PRODUCT, parentId: i.product_id, associationId: id, revision: version + 1, now });
  if (!claim.created) throw new AppError('CONFLICT', 409, { file: 'claimed' });
  const primary = kind === 'image' && !(await primaryOf(tx, i.product_id));
  const source = i.source.kind === 'assistant_artifact_ref' ? { source: 'assistant_copy', sourceRef: `${i.source.artifact_id}:${i.source.revision}` } : {};
  await tx.productMedia.create({ data: { id, productId: i.product_id, fileId, kind, position: slot.position, isPrimary: primary, createdBy: userId, createdAt: now, ...source } });
  await tx.attachmentStaging.delete({ where: { fileId } });
  await tx.file.update({ where: { id: fileId }, data: { confirmed: true } });
  const v = await bumpMedia(tx, i.product_id, now);
  return { media_id: id, file_id: fileId, kind, version: v, primary_id: primary ? id : await primaryOf(tx, i.product_id), reused: false };
}
