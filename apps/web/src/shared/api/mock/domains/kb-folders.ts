// Mock quản lý nguồn KB (TIP-020b) — cùng luật server: thư mục có visibility mặc định / cha / version; tên trùng không dấu → 409;
// cha = chính nó / con cháu → 422; sửa / xoá CAS `if_version` → STALE_VERSION; xoá chỉ thư mục rỗng (kể cả thùng rác, thư mục con) →
// HAS_DEPENDENCIES. Nguồn `origin=catalog` không xoá được (CONFLICT catalog_managed). Tải nguồn: tệp mock → HTML tên tệp; URL / catalog →
// JSON mô tả (như server). Visibility nguồn mới bỏ trống → mặc định thư mục (kb.add_source ở settings-ai.ts gọi `inheritVisibility`).
import { ApiRequestError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';

type Vis = 'public' | 'internal';
type Folder = { id: string; name: string; visibility?: Vis; parent_id?: string | null; version?: number };

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase().trim();
const err = (status: number, code: string, fields: Record<string, string>) => new ApiRequestError(status, { code: code as never, message: code, fields });
const folders = (db: MockDb) => db.settingsAi.kb.folders as Folder[];

function folder(db: MockDb, id: string) {
  const f = folders(db).find((x) => x.id === id);
  if (!f) throw err(404, 'NOT_FOUND', { folder_id: 'not_found' });
  f.version ??= 1;
  f.visibility ??= 'public';
  return f as Required<Folder>;
}
const cas = (f: { version: number }, v?: number) => {
  if (v !== undefined && v !== f.version) throw err(409, 'STALE_VERSION', { version: String(f.version) });
};
const nameFree = (db: MockDb, name: string, self?: string) => {
  if (folders(db).some((f) => f.id !== self && fold(f.name) === fold(name))) throw err(409, 'CONFLICT', { name: 'duplicate' });
};
function parentOk(db: MockDb, parent: string | null | undefined, self?: string) {
  if (!parent) return;
  if (parent === self) throw err(422, 'VALIDATION_FAILED', { parent_id: 'self' });
  for (let cur: string | null | undefined = folder(db, parent).id; cur; cur = folders(db).find((x) => x.id === cur)?.parent_id) {
    if (cur === self) throw err(422, 'VALIDATION_FAILED', { parent_id: 'cycle' });
  }
}

/** Visibility nguồn mới: chỉ định > mặc định thư mục > public (TIP-020b). */
export function inheritVisibility(db: MockDb, explicit: Vis | undefined, folderId: string | undefined): Vis {
  if (explicit) return explicit;
  return folderId ? (folder(db, folderId).visibility ?? 'public') : 'public';
}

/** Chặn sửa / xoá nguồn đồng bộ catalog (mock: `origin` trên doc). */
export function assertEditable(d: { origin?: string }) {
  if (d.origin === 'catalog') throw err(409, 'CONFLICT', { source_id: 'catalog_managed', reason: 'edit_product' });
}

export const kbFolderHandlers: Record<string, MockHandler> = {
  'kb.folder.create': {
    execute: (db, i: { name: string; visibility?: Vis; parent_id?: string }) => {
      nameFree(db, i.name);
      parentOk(db, i.parent_id);
      const id = `f_n${++db.settingsAi.seq}`;
      folders(db).push({ id, name: i.name.trim(), visibility: i.visibility ?? 'public', parent_id: i.parent_id ?? null, version: 1 });
      return { folder_id: id, version: 1 };
    },
  },
  'kb.folder.update': {
    execute: (db, i: { folder_id: string; name?: string; visibility?: Vis; parent_id?: string | null; if_version?: number }) => {
      const f = folder(db, i.folder_id);
      cas(f, i.if_version);
      if (i.name !== undefined) nameFree(db, i.name, f.id);
      if (i.parent_id !== undefined) parentOk(db, i.parent_id, f.id);
      if (i.name !== undefined) f.name = i.name.trim();
      if (i.visibility !== undefined) f.visibility = i.visibility;
      if (i.parent_id !== undefined) f.parent_id = i.parent_id;
      f.version += 1;
      return { folder_id: f.id, version: f.version };
    },
  },
  'kb.folder.delete': {
    execute: (db, i: { folder_id: string; if_version?: number }) => {
      const f = folder(db, i.folder_id);
      cas(f, i.if_version);
      const sources = db.settingsAi.kb.docs.filter((d) => d.folder_id === f.id).length;
      const trashed = Object.values(db.settingsAi.trash).filter((t) => t.doc.folder_id === f.id).length;
      const children = folders(db).filter((x) => x.parent_id === f.id).length;
      if (sources || trashed || children) throw err(409, 'HAS_DEPENDENCIES', { sources: String(sources), trashed: String(trashed), children: String(children) });
      folders(db).splice(folders(db).indexOf(f), 1);
      return { ok: true };
    },
  },
};

/** GET /kb/sources/:id/download (mock): tệp → HTML có tên tệp; nguồn URL / catalog → JSON mô tả như server. Không có → null (404). */
export function kbSourceBlob(db: MockDb, path: string): Blob | null {
  const m = /^\/kb\/sources\/([^/]+)\/download$/.exec(path);
  const d = m ? (db.settingsAi.kb.docs as { id: string; name: string; type: string; origin?: string; url?: string; product_id?: string }[]).find((x) => x.id === m[1]) : null;
  if (!d) return null;
  if (d.origin === 'catalog') return new Blob([JSON.stringify({ data: { kind: 'product', product_id: d.product_id ?? d.id } })], { type: 'application/json' });
  if (d.type === 'url' && d.url) return new Blob([JSON.stringify({ data: { kind: 'url', url: d.url } })], { type: 'application/json' });
  return new Blob([`<!doctype html><meta charset="utf-8"><title>${d.name}</title><p>${d.name}</p>`], { type: 'text/html' });
}
