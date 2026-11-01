// Tải tệp lên (Blueprint §4.4 `POST /v1/files` → `file_id`): ghi Storage trước rồi bảng `file` của DB tenant (`purpose` = nơi dùng:
// kb / avatar / attachment…). Tệp chưa gắn vào chứng từ nào giữ `confirmed=false` (dọn tệp mồ côi là việc của job sau).
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { uuidv7 } from '../ids';
import { MAX_UPLOAD_BYTES, sha256Of, storageKeyOf, type Storage } from './storage';

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

const PURPOSES = new Set(['kb', 'attachment', 'avatar', 'document', 'import']);

export class FilesService {
  constructor(
    private readonly storage: Storage,
    private readonly now: () => Date,
  ) {}

  async upload(db: Pick<TenantDb, 'file'>, ws: string, f: UploadInput): Promise<FileRow> {
    if (!f.body.length) throw new AppError('VALIDATION_FAILED', 422, { file: 'empty' });
    if (f.body.length > MAX_UPLOAD_BYTES) throw new AppError('VALIDATION_FAILED', 413, { file: 'too_large' });
    if (!PURPOSES.has(f.purpose)) throw new AppError('VALIDATION_FAILED', 422, { purpose: 'invalid' });
    const id = uuidv7();
    const at = this.now();
    const key = storageKeyOf(ws, id, at);
    const sha256 = sha256Of(f.body);
    await this.storage.put(key, f.body);
    const name = f.name.replace(/[\/\u0000-\u001f]/g, '_').slice(0, 200) || 'file';
    await db.file.create({ data: { id, storageKey: key, name, mime: f.mime.slice(0, 120) || 'application/octet-stream', size: BigInt(f.body.length), sha256, uploadedBy: f.uploadedBy, purpose: f.purpose, createdAt: at } });
    return { id, name, mime: f.mime, size: f.body.length, sha256 };
  }

  /** Nội dung + metadata — `null` khi không có (id lạ / đã xoá). */
  async read(db: Pick<TenantDb, 'file'>, id: string): Promise<{ row: FileRow; body: Buffer } | null> {
    const r = await db.file.findUnique({ where: { id } });
    if (!r) return null;
    return { row: { id: r.id, name: r.name, mime: r.mime, size: Number(r.size), sha256: r.sha256 ?? '' }, body: await this.storage.get(r.storageKey) };
  }
}
