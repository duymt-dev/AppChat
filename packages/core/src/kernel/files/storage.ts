// Object storage (Blueprint §11 "Object storage", L1325 / L1402): port `Storage` — bản `local` (dev `./.data/files`, prod
// `/srv/appchat/files` + backup restic). `s3` (S3-compatible) để sau khi cần, chỉ đổi env. Khoá = `<workspace>/<yyyy>/<mm>/<file_id>`
// (không chứa tên tệp người dùng — tránh path traversal). Bảng `file` (kernel.prisma) giữ metadata + sha256.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

export const STORAGE = Symbol('STORAGE');
/** Giới hạn tải lên (Blueprint §4.4 misc `POST /v1/files`). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface Storage {
  put(key: string, body: Uint8Array): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class LocalStorage implements Storage {
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private path(key: string): string {
    const p = resolve(this.root, ...key.split('/'));
    if (!p.startsWith(this.root + sep)) throw new Error('storage key ngoài thư mục gốc');
    return p;
  }

  async put(key: string, body: Uint8Array): Promise<void> {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, body);
  }

  get(key: string): Promise<Buffer> {
    return readFile(this.path(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.path(key), { force: true });
  }
}

export const sha256Of = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
export const storageKeyOf = (workspaceId: string, fileId: string, at: Date) =>
  [workspaceId, String(at.getUTCFullYear()), String(at.getUTCMonth() + 1).padStart(2, '0'), fileId].join('/');
export const defaultFilesDir = (cwd = process.cwd()) => join(cwd, '.data', 'files');
