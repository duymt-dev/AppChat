// Đích tải lên tệp riêng tư của bản ghi (TIP-032d §2.1–2.2, mở rộng TIP-027b): kernel trung lập — domain đăng ký loại đích (đơn / đề nghị
// / sản phẩm) với kiểm quyền GHI đích hiện hành TRƯỚC khi lưu bytes + hồ sơ kiểm cấu trúc. `POST /v1/files` purpose `record_attachment`
// kèm `parent_type` / `parent_id` chỉ đi qua registry này (kernel không import sales / catalog). Kiểm cấu trúc chạy trong tiến trình con cô
// lập lúc gắn (prepare) — staging ở đây chỉ là `pending` gắn digest, chưa phải "đã gắn".
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../actions/action-context';
import type { FilesService } from './files.service';
import { RECORD_ATTACHMENT } from './file-claims';
import { VALIDATOR_VERSION, validateIsolated, validatorEntry, type ValidationProfile } from './attachment-validation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AttachmentTarget {
  parentType: string;
  /** Hồ sơ kiểm cấu trúc trong tiến trình cô lập (`record` = tập 032d; `product` = ảnh có giới hạn điểm ảnh + tài liệu). */
  profile: ValidationProfile;
  /** Đích còn GHI được theo quyền hiện hành của người tải (404 / 403 có kiểu) — chạy trước khi lưu bytes. */
  assertWritable(tx: TenantTx, authz: AuthzContext, parentId: string): Promise<void>;
}

const targets = new Map<string, AttachmentTarget>();

export function registerAttachmentTarget(t: AttachmentTarget): void {
  targets.set(t.parentType, t);
}

export const attachmentTarget = (parentType: string): AttachmentTarget | undefined => targets.get(parentType);

export interface StagedUpload {
  file_id: string;
  name: string;
  size: number;
  mime: string;
  status: 'pending';
}

/** Tải tệp cho đúng đích: kiểm quyền ghi đích → lưu tệp purpose `record_attachment` → staging `pending` gắn digest. */
export async function uploadRecordAttachment(
  db: TenantDb,
  files: FilesService,
  a: { ws: string; userId: string; authz: AuthzContext; parentType: string | undefined; parentId: string | undefined; name: string; mime: string; body: Buffer },
): Promise<StagedUpload> {
  const t = a.parentType ? targets.get(a.parentType) : undefined;
  if (!t || !a.parentId || !UUID.test(a.parentId)) throw new AppError('VALIDATION_FAILED', 422, { parent: 'required' });
  await db.$transaction((tx) => t.assertWritable(tx, a.authz, a.parentId!));
  const f = await files.upload(db, a.ws, { name: a.name, mime: a.mime, body: a.body, purpose: RECORD_ATTACHMENT, uploadedBy: a.userId });
  await db.attachmentStaging.create({ data: { fileId: f.id, uploadedBy: a.userId, parentType: t.parentType, parentId: a.parentId, digest: f.sha256 } });
  return { file_id: f.id, name: f.name, size: f.size, mime: f.mime, status: 'pending' };
}

/** Bundle cô lập — mặc định cạnh entry tiến trình; test / triển khai đặt ATTACHMENT_VALIDATOR_ENTRY. */
let entryOverride: string | null | undefined;
export const setValidatorEntry = (e: string | null | undefined) => void (entryOverride = e);
const entry = () => (entryOverride === undefined ? validatorEntry() : entryOverride);

/**
 * Kiểm (hoặc kiểm lại) một staging theo hồ sơ của đích đã ghi ở staging. Đã hợp lệ với cùng validator + digest → bỏ qua. Không ném: trạng
 * thái ghi vào staging để execute quyết. Thiếu bundle cô lập → `unavailable` (không kiểm trong tiến trình chính).
 */
export async function validateStaged(db: TenantDb, files: FilesService, fileId: string, now: () => Date): Promise<void> {
  const s = await db.attachmentStaging.findUnique({ where: { fileId } });
  if (!s || (s.status === 'structurally_valid' && s.validatorVersion === VALIDATOR_VERSION)) return;
  const f = await files.read(db, fileId);
  if (!f) return;
  await db.attachmentStaging.updateMany({ where: { fileId, status: { not: 'structurally_valid' } }, data: { status: 'validating', updatedAt: now() } });
  const r = await validateIsolated(entry(), f.body, f.row.name, {}, targets.get(s.parentType)?.profile ?? 'record');
  const status = r.ok ? 'structurally_valid' : r.reason === 'isolation_unavailable' ? 'unavailable' : 'rejected';
  await db.attachmentStaging.updateMany({
    where: { fileId, digest: f.row.sha256 },
    data: { status, validatorVersion: VALIDATOR_VERSION, kind: r.ok ? r.kind : null, reason: r.ok ? null : r.reason, updatedAt: now() },
  });
}

/**
 * Staging gắn được cho đúng cha: do chính người gọi tải lên cho ĐÚNG cha này, đã kiểm cấu trúc hợp lệ với validator hiện hành và digest
 * khớp tệp. Sai bất kỳ điều kiện → 422 / 409 có lý do trường (không lộ tệp của người khác — tệp lạ = not_found).
 */
export async function stagedFor(tx: TenantTx, a: { fileId: string; userId: string; type: string; parentId: string }) {
  const s = UUID.test(a.fileId) ? await tx.attachmentStaging.findUnique({ where: { fileId: a.fileId } }) : null;
  if (!s || s.uploadedBy !== a.userId) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
  if (s.parentType !== a.type || s.parentId !== a.parentId) throw new AppError('CONFLICT', 409, { file_id: 'other_target' });
  if (s.status === 'unavailable') throw new AppError('VALIDATION_ISOLATION_UNAVAILABLE', 503, { file_id: 'validation_unavailable' });
  if (s.status !== 'structurally_valid') throw new AppError('VALIDATION_FAILED', 422, { file_id: s.status === 'rejected' ? (s.reason ?? 'rejected') : 'not_validated' });
  const f = await tx.file.findUnique({ where: { id: a.fileId }, select: { id: true, sha256: true, purpose: true } });
  if (!f || f.purpose !== 'record_attachment' || f.sha256 !== s.digest || s.validatorVersion !== VALIDATOR_VERSION) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_validated' });
  return s;
}
