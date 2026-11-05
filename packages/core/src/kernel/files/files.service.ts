// Tải tệp lên (Blueprint §4.4 `POST /v1/files` → `file_id`): qua cổng `guardUpload` (TIP-045b — loại theo nội dung, khớp đuôi / mime,
// giới hạn theo loại; áp cho mọi chỗ gọi kể cả server tự sinh tệp) → ghi Storage → bảng `file` của DB tenant (`purpose` = nơi dùng:
// kb / avatar / attachment…), mime lưu là mime chuẩn theo nội dung. Tệp chưa gắn vào chứng từ nào giữ `confirmed=false`.
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../ids';
import { sha256Of, storageKeyOf, type Storage } from './storage';
import { guardUpload } from './upload-guard';

export interface UploadInput {
  name: string;
  mime: string;
  body: Uint8Array;
  purpose: string;
  uploadedBy: string | null;
}

export interface FileRow {
  id: string;
  name: string;
  mime: string;
  size: number;
  sha256: string;
}

export class FilesService {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date,
  ) {}

  async upload(db: Pick<TenantDb, 'file'>, ws: string, f: UploadInput): Promise<FileRow> {
    const g = guardUpload(f);
    const id = uuidv7();
    const at = this.now();
    const key = storageKeyOf(ws, id, at);
    const sha256 = sha256Of(f.body);
    await this.storage.put(key, f.body);
    await db.file.create({ data: { id, storageKey: key, name: g.name, mime: g.mime, size: BigInt(f.body.length), sha256, uploadedBy: f.uploadedBy, purpose: f.purpose, createdAt: at } });
    return { id, name: g.name, mime: g.mime, size: f.body.length, sha256 };
  }

  /** Nội dung + metadata — `null` khi không có (id lạ / đã xoá). */
  async read(db: Pick<TenantDb, 'file'>, id: string): Promise<{ row: FileRow; body: Buffer } | null> {
    const r = await db.file.findUnique({ where: { id } });
    if (!r) return null;
    return { row: { id: r.id, name: r.name, mime: r.mime, size: Number(r.size), sha256: r.sha256 ?? '' }, body: await this.storage.get(r.storageKey) };
  }
}
