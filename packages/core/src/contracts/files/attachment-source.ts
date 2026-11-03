// Tệp khách gửi trong hội thoại → nguồn hợp đồng (TIP-030b spec 3). Thứ tự kiểm TRƯỚC khi đọc bytes: tin tồn tại → hội thoại của tin
// thấy được theo scope inbox hiện hành (ngoài scope → 403 SCOPE_FORBIDDEN, tin lạ → 404) → `attachment_idx` thuộc đúng tin → tệp đính kèm
// là tệp TRONG kho của chính workspace (link ký `/v1/files/<id>/raw` đúng origin API cấu hình, đúng workspace, chữ ký HMAC hợp lệ) →
// guard kernel (purpose / mime / cỡ; không cần chính người tải — quyền đến từ ràng buộc tin, không từ file_id đoán) → kiểm bytes.
// Tệp ở CDN của kênh (chưa lưu kho) → 422 `attachment: not_stored` — không tải từ URL ngoài (DV-025; lưu media kênh vào kho là 045b).
import type { TenantDb } from '@appchat/db';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { FileAccessRule } from '../../kernel/files/file-access';
import type { FilesService } from '../../kernel/files/files.service';
import { verifyFileSig } from '../../kernel/files/signed-url';
import { CONTRACT_DOCX, CONTRACT_PDF, PDF_LIMITS, guardContractFile, type GuardedDocument } from '../../documents/public';
import { writableConversation } from '../../inbox/public';

/** Tệp gắn với tin trong hội thoại đã kiểm scope: người tải có thể là kênh (null) / người khác; hạn dùng không áp (tin đã lưu). */
export const ATTACHMENT_RULE: FileAccessRule = {
  purposes: ['attachment', 'document'],
  ownerOnly: false,
  maxAgeMs: Number.MAX_SAFE_INTEGER,
  mimes: [CONTRACT_PDF, CONTRACT_DOCX, 'application/octet-stream'],
  maxBytes: PDF_LIMITS.maxBytes,
};

interface Links {
  apiBase: string;
  key: Buffer;
}

/** `file_id` từ link ký nội bộ; link ngoài / sai origin / sai workspace / sai chữ ký → null. */
export function storedFileId(url: string, links: Links, ws: string): string | null {
  let u: URL;
  let base: URL;
  try {
    u = new URL(url);
    base = new URL(links.apiBase);
  } catch {
    return null;
  }
  if (u.origin !== base.origin) return null;
  const m = /^\/v1\/files\/([0-9a-f-]{36})\/raw$/i.exec(u.pathname.slice(base.pathname.replace(/\/$/, '').length));
  const sig = u.searchParams.get('sig');
  if (!m || u.searchParams.get('ws') !== ws || !sig) return null;
  return verifyFileSig(links.key, ws, m[1]!, sig) ? m[1]!.toLowerCase() : null;
}

export interface AttachmentRef {
  conversationId: string;
  contactId: string | null;
  messageId: string;
  idx: number;
  name: string | null;
}

/** Kiểm ràng buộc tin + tệp (trong transaction của action, chưa đọc bytes). */
export async function resolveAttachment(tx: TenantTx, authz: AuthzContext, links: Links | null, ws: string, messageId: string, idx: number): Promise<AttachmentRef & { fileId: string }> {
  const m = /^[0-9a-f-]{36}$/i.test(messageId) ? await tx.message.findUnique({ where: { id: messageId }, select: { id: true, conversationId: true, attachments: true, deletedAt: true } }) : null;
  if (!m || m.deletedAt) throw new AppError('NOT_FOUND', 404, { message_id: 'not_found' });
  const conv = await writableConversation(tx, authz, m.conversationId);
  const list = Array.isArray(m.attachments) ? (m.attachments as { url?: unknown; name?: unknown }[]) : [];
  const a = list[idx];
  if (!a || typeof a.url !== 'string') throw new AppError('VALIDATION_FAILED', 422, { attachment_idx: 'out_of_range' });
  if (!links) throw new AppError('NOT_IMPLEMENTED', 501, { attachments: 'file_links' });
  const fileId = storedFileId(a.url, links, ws);
  if (!fileId) throw new AppError('VALIDATION_FAILED', 422, { attachment: 'not_stored' });
  return { conversationId: conv.id, contactId: conv.contactId, messageId: m.id, idx, name: typeof a.name === 'string' ? a.name : null, fileId };
}

/** Guard + bytes của tệp đính kèm đã kiểm ràng buộc. */
export function guardAttachment(db: Pick<TenantDb, 'file'>, files: FilesService, userId: string, fileId: string, now: Date): Promise<GuardedDocument> {
  return guardContractFile(db, files, userId, fileId, now, ATTACHMENT_RULE);
}
