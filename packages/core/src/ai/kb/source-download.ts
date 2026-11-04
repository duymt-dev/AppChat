// Tải nguồn KB (TIP-020b, `GET /v1/kb/sources/:id/download`): nhận source_id (không bao giờ file_id tự do) — nguồn còn sống của tenant
// người gọi (kb.manage kiểm ở controller). Theo loại nguồn:
//   upload có tệp → byte gốc qua FilesService (tên / mime từ bảng file);
//   text / conversation → xuất đúng văn bản đã lưu (.txt UTF-8);
//   url → KHÔNG tải lại website (không SSRF): trả `{ kind: 'url', url }` chỉ khi http(s) để FE mở tab;
//   catalog → `{ kind: 'product', product_id }` để FE điều hướng sang sản phẩm.
// Nguồn đã xoá / id lạ / tệp mất → 404, không byte nào.
import { AppError } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { FilesService } from '../../kernel/files/files.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TXT = 'text/plain; charset=utf-8';

export type KbDownload =
  | { kind: 'file'; name: string; mime: string; body: Buffer }
  | { kind: 'url'; url: string }
  | { kind: 'product'; product_id: string };

const notFound = () => new AppError('NOT_FOUND', 404, { source_id: 'not_found' });
/** Tên tải về: bỏ ký tự điều khiển / phân cách đường dẫn, giữ dấu tiếng Việt. */
export const safeName = (n: string) => n.replace(/[\\/\u0000-\u001f\u007f"]/g, '_').trim().slice(0, 200) || 'source';
const httpUrl = (u: string | null) => {
  try {
    const x = u ? new URL(u) : null;
    return x && (x.protocol === 'https:' || x.protocol === 'http:') ? x.toString() : null;
  } catch {
    return null;
  }
};

export async function sourceDownload(db: Pick<TenantDb, 'kbSource' | 'file'>, files: FilesService | null, id: string): Promise<KbDownload> {
  const s = UUID.test(id) ? await db.kbSource.findUnique({ where: { id }, select: { id: true, name: true, origin: true, fileId: true, url: true, body: true, productId: true, deletedAt: true } }) : null;
  if (!s || s.deletedAt) throw notFound();
  if (s.origin === 'catalog') {
    if (!s.productId) throw notFound();
    return { kind: 'product', product_id: s.productId };
  }
  if (s.origin === 'url') {
    const url = httpUrl(s.url);
    if (!url) throw notFound();
    return { kind: 'url', url };
  }
  if (s.fileId) {
    const f = files ? await files.read(db, s.fileId) : null;
    if (!f) throw notFound();
    return { kind: 'file', name: safeName(f.row.name), mime: f.row.mime || 'application/octet-stream', body: f.body };
  }
  if (s.body !== null) {
    const base = safeName(s.name).replace(/\.(txt|md)$/i, '');
    return { kind: 'file', name: `${base}.txt`, mime: TXT, body: Buffer.from(s.body, 'utf8') };
  }
  // Tài liệu chỉ có tên (mock cũ, không tệp / văn bản) — không có gì để tải.
  throw new AppError('NOT_FOUND', 404, { source_id: 'no_content' });
}
