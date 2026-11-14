// Guard truy cập tệp đã tải lên (TIP-023c 8c — nền dùng chung, không phụ thuộc domain): trước khi một tệp đi vào model / extension
// domain, kiểm theo DB tenant HIỆN TẠI (tệp workspace khác không tồn tại ở đây → not_found, không lộ là có), người tải lên, mục đích
// (purpose), hạn dùng (tệp chưa gắn chứng từ chỉ dùng trong cửa sổ ngắn), mime cho phép và kích thước. Không trả storage key / URL.
// 030b / 038b tái dùng guard này (không là điều kiện ngược).
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { MAX_UPLOAD_BYTES } from './storage';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FileAccessRule {
  /** Purpose được chấp nhận (vd. `attachment`). */
  purposes: readonly string[];
  /** Chỉ chính người tải lên được dùng (mặc định true). */
  ownerOnly?: boolean;
  /** Tệp chưa xác nhận quá tuổi này (ms) → hết hạn. Mặc định 24h. */
  maxAgeMs?: number;
  /** Mime cho phép (khớp đầy đủ hoặc tiền tố `image/`). Vắng → mọi mime. */
  mimes?: readonly string[];
  maxBytes?: number;
}

export interface GrantedFile {
  id: string;
  name: string;
  mime: string;
  size: number;
}

export type FileDenied = 'not_found' | 'forbidden' | 'purpose' | 'expired' | 'mime' | 'too_large';

export const DEFAULT_FILE_TTL_MS = 24 * 3600_000;

const mimeOk = (mime: string, allow?: readonly string[]) => !allow || allow.some((m) => (m.endsWith('/') ? mime.startsWith(m) : mime === m));

/** Kiểm một tệp; trả metadata an toàn hoặc lý do từ chối. */
export async function checkFile(db: Pick<TenantDb, 'file'>, userId: string, id: string, rule: FileAccessRule, now: Date): Promise<GrantedFile | { denied: FileDenied }> {
  const f = UUID.test(id) ? await db.file.findUnique({ where: { id }, select: { id: true, name: true, mime: true, size: true, uploadedBy: true, purpose: true, confirmed: true, createdAt: true } }) : null;
  if (!f) return { denied: 'not_found' };
  if ((rule.ownerOnly ?? true) && f.uploadedBy !== userId) return { denied: 'forbidden' };
  if (!rule.purposes.includes(f.purpose)) return { denied: 'purpose' };
  if (!f.confirmed && now.getTime() - f.createdAt.getTime() > (rule.maxAgeMs ?? DEFAULT_FILE_TTL_MS)) return { denied: 'expired' };
  if (!mimeOk(f.mime, rule.mimes)) return { denied: 'mime' };
  if (Number(f.size) > (rule.maxBytes ?? MAX_UPLOAD_BYTES)) return { denied: 'too_large' };
  return { id: f.id, name: f.name, mime: f.mime, size: Number(f.size) };
}

/** Kiểm cả danh sách; một tệp bị từ chối → 422 nêu tệp + lý do (không xử lý nửa vời). */
export async function requireFiles(db: Pick<TenantDb, 'file'>, userId: string, ids: readonly string[], rule: FileAccessRule, now: Date): Promise<GrantedFile[]> {
  const out: GrantedFile[] = [];
  const fields: Record<string, string> = {};
  for (const id of [...new Set(ids)]) {
    const r = await checkFile(db, userId, id, rule, now);
    if ('denied' in r) fields[`attachments.${id.slice(0, 80)}`] = r.denied;
    else out.push(r);
  }
  if (Object.keys(fields).length) throw new AppError('VALIDATION_FAILED', 422, fields);
  return out;
}
