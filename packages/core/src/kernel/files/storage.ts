// Object storage (Blueprint §11 "Object storage", L1325 / L1402): port `Storage` — bản `local` (dev `./.data/files`, prod
// `/srv/appchat/files` + backup restic). `s3` (S3-compatible) để sau khi cần, chỉ đổi env. Khoá = `<workspace>/<yyyy>/<mm>/<file_id>`
// (không chứa tên tệp người dùng — tránh path traversal). Bảng `file` (kernel.prisma) giữ metadata + sha256.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

export const STORAGE = Symbol('STORAGE');
/** Giới hạn tải lên (Blueprint §4.4 misc `POST /v1/files`). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface Storage {
  put(key: string, body: Uint8Array): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /**
   * Xoá MỌI đối tượng dưới tiền tố `<workspace_id>/` (purge workspace đã xoá — TIP-041). Chỉ nhận đúng một UUID workspace (không đường
   * dẫn / tiền tố tuỳ ý): không bao giờ xoá ra ngoài thư mục của workspace đó. Trả số đối tượng đã xoá (local: 1 nếu thư mục tồn tại).
   */
  deleteWorkspace(workspaceId: string): Promise<number>;
}

const WS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const assertWorkspacePrefix = (id: string) => {
  if (!WS_UUID.test(id)) throw new Error('storage: workspace id không hợp lệ');
  return id;
};

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

  async deleteWorkspace(workspaceId: string): Promise<number> {
    const p = this.path(assertWorkspacePrefix(workspaceId));
    const had = await stat(p).then(() => 1, () => 0);
    await rm(p, { recursive: true, force: true });
    return had;
  }
}

export const sha256Of = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
export const storageKeyOf = (workspaceId: string, fileId: string, at: Date) =>
  [workspaceId, String(at.getUTCFullYear()), String(at.getUTCMonth() + 1).padStart(2, '0'), fileId].join('/');
export const defaultFilesDir = (cwd = process.cwd()) => join(cwd, '.data', 'files');
