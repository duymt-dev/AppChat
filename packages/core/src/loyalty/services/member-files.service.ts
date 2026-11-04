// Tệp của thành viên (TIP-036 mục 4, tab "Tệp" prototype L4716): liên kết `loyalty_member_file(contact_id, file_id)` — tệp thuộc tenant,
// chính người gắn tải lên (purpose attachment), chưa gắn ở thành viên khác. Đọc danh sách / nội dung chỉ sau khi khách trong scope crm
// người xem (ngoài scope / file không gắn với khách → 404) — không dùng file_id để đọc tệp của khách khác.
import { AppError, createFmt, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { FilesService } from '../../kernel/files/files.service';
import { visibleContact } from '../../crm/public';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_FILES = 200;

/** Tệp gắn được: thuộc tenant, đúng người tải, purpose attachment, chưa gắn khách nào. */
export async function attachableFile(tx: TenantTx, fileId: string, userId: string) {
  const f = UUID.test(fileId) ? await tx.file.findUnique({ where: { id: fileId } }) : null;
  if (!f || f.uploadedBy !== userId || f.purpose !== 'attachment') throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
  if (await tx.loyaltyMemberFile.findFirst({ where: { fileId }, select: { contactId: true } })) throw new AppError('CONFLICT', 409, { file_id: 'attached' });
  return f;
}

export async function memberFiles(tx: TenantTx, authz: AuthzContext, contactId: string, locale: string, timeZone: string) {
  const { contact } = await visibleContact(tx, authz, contactId);
  const links = await tx.loyaltyMemberFile.findMany({ where: { contactId: contact.id }, orderBy: { createdAt: 'desc' }, take: MAX_FILES });
  const files = links.length ? await tx.file.findMany({ where: { id: { in: links.map((l) => l.fileId) } }, select: { id: true, name: true, mime: true, size: true } }) : [];
  const byId = new Map(files.map((f) => [f.id, f]));
  const fmt = createFmt({ locale, timeZone });
  return links.flatMap((l) => {
    const f = byId.get(l.fileId);
    if (!f) return [];
    const ext = (f.name.split('.').pop() ?? '').toLowerCase().slice(0, 8);
    return [{ file_id: f.id, name: f.name, ext, mime: f.mime, size: Number(f.size), created_by: l.createdBy, created_at: l.createdAt.toISOString(), at: fmt.date(l.createdAt) }];
  });
}

/** Nội dung tệp: kiểm scope khách + liên kết trước khi đọc Storage. */
export async function memberFile(db: TenantDb, files: FilesService, authz: AuthzContext, contactId: string, fileId: string) {
  if (!UUID.test(fileId)) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
  await db.$transaction(async (tx) => {
    const { contact } = await visibleContact(tx, authz, contactId);
    if (!(await tx.loyaltyMemberFile.findUnique({ where: { contactId_fileId: { contactId: contact.id, fileId } } }))) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
  });
  const f = await files.read(db, fileId);
  if (!f) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
  return f;
}
