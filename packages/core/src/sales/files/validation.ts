// Kiểm cấu trúc tệp đính kèm bản ghi trước khi gắn (TIP-032d §2.1, §1.4): chạy trong `prepare` của action gắn (NGOÀI transaction, sau xác
// nhận) — đọc bytes staging, kiểm trong tiến trình con cô lập, ghi trạng thái + validator_version + digest vào staging. Chạy lại (crash / gửi
// lại) kiểm lại cùng digest, không model, không tính phí. Thiếu bundle cô lập → `unavailable` (không kiểm trong tiến trình chính).
import type { TenantDb } from '@appchat/db';
import type { FilesService } from '../../kernel/files/files.service';
import { VALIDATOR_VERSION, validateIsolated, validatorEntry } from '../../kernel/files/attachment-validation';

/** Bundle cô lập — mặc định cạnh entry tiến trình; test / triển khai đặt ATTACHMENT_VALIDATOR_ENTRY. */
let entryOverride: string | null | undefined;
export const setValidatorEntry = (e: string | null | undefined) => void (entryOverride = e);
const entry = () => (entryOverride === undefined ? validatorEntry() : entryOverride);

/** Kiểm (hoặc kiểm lại) một staging. Đã hợp lệ với cùng validator + digest → bỏ qua. Không ném: trạng thái ghi vào staging để execute quyết. */
export async function validateStaged(db: TenantDb, files: FilesService, fileId: string, now: () => Date): Promise<void> {
  const s = await db.attachmentStaging.findUnique({ where: { fileId } });
  if (!s || (s.status === 'structurally_valid' && s.validatorVersion === VALIDATOR_VERSION)) return;
  const f = await files.read(db, fileId);
  if (!f) return;
  await db.attachmentStaging.updateMany({ where: { fileId, status: { not: 'structurally_valid' } }, data: { status: 'validating', updatedAt: now() } });
  const r = await validateIsolated(entry(), f.body, f.row.name);
  const status = r.ok ? 'structurally_valid' : r.reason === 'isolation_unavailable' ? 'unavailable' : 'rejected';
  await db.attachmentStaging.updateMany({
    where: { fileId, digest: f.row.sha256 },
    data: { status, validatorVersion: VALIDATOR_VERSION, kind: r.ok ? r.kind : null, reason: r.ok ? null : r.reason, updatedAt: now() },
  });
}
