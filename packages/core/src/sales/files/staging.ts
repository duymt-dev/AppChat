// Tải lên tệp đính kèm bản ghi (TIP-032d §2.1–2.2): `POST /v1/files` purpose `record_attachment` kèm đích dự định (order / invoice + id).
// Kiểm quyền GHI cha hiện hành TRƯỚC khi lưu (không cho người không có quyền đổ tệp vào bản ghi), rồi tạo staging `pending` gắn digest — chưa
// phải "đã gắn"; kiểm cấu trúc chạy khi gắn. Purpose / đích do server kiểm, không truyền thẳng xuống Storage.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { FilesService } from '../../kernel/files/files.service';
import { RECORD_ATTACHMENT } from '../../kernel/files/file-claims';
import { orderPort } from '../orders/files/read';
import { invoicePort } from '../payments/files/read';
import { UUID, type ParentType } from './association';

const PORTS = { order: orderPort, invoice: invoicePort } as const;

export interface StagedUpload {
  file_id: string;
  name: string;
  size: number;
  mime: string;
  status: 'pending';
}

export async function uploadRecordAttachment(
  db: TenantDb,
  files: FilesService,
  a: { ws: string; userId: string; authz: AuthzContext; parentType: string | undefined; parentId: string | undefined; name: string; mime: string; body: Buffer },
): Promise<StagedUpload> {
  const type = a.parentType as ParentType;
  if (!(type in PORTS) || !a.parentId || !UUID.test(a.parentId)) throw new AppError('VALIDATION_FAILED', 422, { parent: 'required' });
  const port = PORTS[type];
  const perm = type === 'order' ? 'order.manage' : 'invoice.manage';
  if (!a.authz.isOwner && !a.authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
  await db.$transaction(async (tx) => {
    await port.readable(tx, a.authz, a.parentId!);
    if (!(await port.writable(tx, a.authz, a.parentId!))) throw new AppError('SCOPE_FORBIDDEN', 403, { parent: 'read_only' });
  });
  const f = await files.upload(db, a.ws, { name: a.name, mime: a.mime, body: a.body, purpose: RECORD_ATTACHMENT, uploadedBy: a.userId });
  await db.attachmentStaging.create({ data: { fileId: f.id, uploadedBy: a.userId, parentType: type, parentId: a.parentId, digest: f.sha256 } });
  return { file_id: f.id, name: f.name, size: f.size, mime: f.mime, status: 'pending' };
}
