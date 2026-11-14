// Ảnh / tài liệu sản phẩm ở mock (TIP-027b) — mirror `catalog/media` của server: tải `record_attachment` khai đích product (kiểm
// catalog.manage + sản phẩm sống TRƯỚC khi nhận tệp) → staging riêng; `product.media_attach` chỉ nhận staging đúng sản phẩm, version bộ
// media khớp (409 STALE_VERSION), giới hạn 10 ảnh / 20 tài liệu; ảnh đầu tiên thành ảnh chính; gỡ ảnh chính → ảnh sống kế tiếp; sắp xếp
// nhận hoán vị ĐỦ id sống của một loại. Gỡ chỉ đánh dấu (tệp giữ). Mock không kiểm cấu trúc thật: chỉ đuôi PNG/JPEG/WEBP + tài liệu theo
// danh sách 032d; tên chứa "animated" / "huge" → bị từ chối khi gắn (minh hoạ kiểm ảnh động / quá cỡ). Tải bytes qua `/files/:id`.
import { ApiRequestError, ROLE_DEFS, can } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';
import { ME } from './customers';

type Kind = 'image' | 'document';
interface Media {
  media_id: string;
  file_id: string;
  kind: Kind;
  name: string;
  mime: string;
  bytes: number;
  position: number;
  is_primary: boolean;
  version: number;
  created_at: string;
  detached: boolean;
}
interface Staged {
  product: string;
  name: string;
  mime: string;
  bytes: number;
  kind: Kind;
}

export const PRODUCT_MEDIA_LIMITS = { image: 10, document: 20 } as const;
const IMAGE = /\.(png|jpe?g|webp)$/i;
const DOC = /\.(pdf|docx|xlsx|txt|csv)$/i;
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf', txt: 'text/plain', csv: 'text/csv' };
// PNG 1×1 (màu xanh thương hiệu) — bản xem trước mock là ảnh thật để `<img>` tải được object URL.
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPQPXr8PwAFhwKoX3n1aQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));

// Trạng thái theo đối tượng state sản phẩm — tạo lại state sản phẩm (reset mock / test) thì media cũng mới.
interface State {
  media: Map<string, Media[]>;
  versions: Map<string, number>;
  staged: Map<string, Staged>;
  claims: Map<string, string>;
}
const states = new WeakMap<object, State>();
const st = (db: MockDb): State => {
  let s = states.get(db.products);
  if (!s) states.set(db.products, (s = { media: new Map(), versions: new Map(), staged: new Map(), claims: new Map() }));
  return s;
};
let seq = 0;
const nid = (p: string) => `${p}_${(++seq).toString(36)}`;

const err = (status: number, code: string, fields: Record<string, string>): never => {
  throw new ApiRequestError(status, { code: code as never, message: Object.values(fields)[0] ?? code, fields });
};

const canManage = (db: MockDb) => can({ userId: ME, isOwner: db.role === 'owner', permissions: new Set(ROLE_DEFS[db.role].permissions), scope: ROLE_DEFS[db.role].scope, teamIds: [] }, 'catalog.manage');

/** Sản phẩm sống (404 nếu không / đã lưu trữ). */
function product(db: MockDb, id: string) {
  const p = db.products.products.find((x) => x.id === id && !x.deleted);
  if (!p) err(404, 'NOT_FOUND', { product_id: 'not_found' });
  return p!;
}

const rows = (db: MockDb, id: string) => {
  const { media } = st(db);
  if (!media.has(id)) media.set(id, []);
  return media.get(id)!;
};
const live = (db: MockDb, id: string, kind?: Kind) => rows(db, id).filter((m) => !m.detached && (!kind || m.kind === kind)).sort((a, b) => a.position - b.position || a.media_id.localeCompare(b.media_id));
const version = (db: MockDb, id: string) => st(db).versions.get(id) ?? 0;
const bump = (db: MockDb, id: string) => (st(db).versions.set(id, version(db, id) + 1), version(db, id));
const primaryOf = (db: MockDb, id: string) => live(db, id, 'image').find((m) => m.is_primary)?.media_id ?? null;

function lock(db: MockDb, id: string, ifVersion: number) {
  product(db, id);
  if (!canManage(db)) err(403, 'FORBIDDEN', { permission: 'catalog.manage' });
  if (version(db, id) !== ifVersion) err(409, 'STALE_VERSION', { if_version: 'changed' });
}

function byId(db: MockDb, id: string, mediaId: string) {
  const m = rows(db, id).find((x) => x.media_id === mediaId);
  if (!m) err(404, 'NOT_FOUND', { media_id: 'not_found' });
  if (m!.detached) err(409, 'CONFLICT', { media_id: 'detached' });
  return m!;
}

/** `POST /v1/files` purpose record_attachment + parent_type product (mock-transport gọi): kiểm đích + quyền trước khi nhận. */
export function stageProductFile(db: MockDb, fileId: string, f: { name: string; size: number; type: string }, productId: string) {
  product(db, productId);
  if (!canManage(db)) err(403, 'FORBIDDEN', { permission: 'catalog.manage' });
  const kind: Kind | null = IMAGE.test(f.name) ? 'image' : DOC.test(f.name) ? 'document' : null;
  if (!kind) err(415, 'VALIDATION_FAILED', { file: 'type_not_allowed' });
  st(db).staged.set(fileId, { product: productId, name: f.name, mime: f.type || MIME[f.name.split('.').pop()!.toLowerCase()] || 'application/octet-stream', bytes: f.size, kind: kind! });
}

/** Bytes của tệp media sống (ảnh → PNG thật, tài liệu → chữ minh hoạ); null = không phải tệp media sản phẩm. */
export function productMediaBlob(db: MockDb, path: string): Blob | null {
  const m = path.match(/^\/files\/([^/]+)$/);
  if (!m) return null;
  for (const list of st(db).media.values()) {
    const f = list.find((r) => r.file_id === m[1] && !r.detached);
    if (f) return f.kind === 'image' ? new Blob([PNG], { type: 'image/png' }) : new Blob([`Tệp mock: ${f.name}`], { type: f.mime });
  }
  return null;
}

/** Khối `media` của GET /products/:id — cùng shape `productMediaSchema` của shared. */
export function productMediaOf(db: MockDb, id: string) {
  return {
    items: [...live(db, id, 'image'), ...live(db, id, 'document')].map((m) => ({ media_id: m.media_id, file_id: m.file_id, kind: m.kind, name: m.name, mime: m.mime, bytes: m.bytes, position: m.position, is_primary: m.is_primary, version: m.version, created_at: m.created_at, available: true })),
    version: version(db, id),
    can_edit: canManage(db),
    limits: { ...PRODUCT_MEDIA_LIMITS },
  };
}

type Src = { kind: 'target_upload_handle'; file_id: string } | { kind: 'assistant_artifact_ref'; artifact_id: string; revision: number };
const receipt = (db: MockDb, id: string, mediaId: string) => ({ media_id: mediaId, version: version(db, id), primary_id: primaryOf(db, id) });

export const productMediaHandlers: Record<string, MockHandler> = {
  'product.media_list': {
    execute: (db, i: { product_id: string; kind?: Kind }) => {
      product(db, i.product_id);
      const all = productMediaOf(db, i.product_id);
      return i.kind ? { ...all, items: all.items.filter((m) => m.kind === i.kind) } : all;
    },
  },
  'product.media_attach': {
    preview: (db, i: { source: Src }) => ({ summary: i.source.kind === 'target_upload_handle' ? (st(db).staged.get(i.source.file_id)?.name ?? '') : '' }),
    execute: (db, i: { product_id: string; source: Src; if_version: number }) => {
      const id = i.product_id;
      product(db, id);
      if (i.source.kind !== 'target_upload_handle') return err(422, 'VALIDATION_FAILED', { source: 'artifact_copy_unavailable' });
      const fileId = i.source.file_id;
      const same = live(db, id).find((m) => m.file_id === fileId);
      if (same) return { ...receipt(db, id, same.media_id), file_id: fileId, kind: same.kind, reused: true };
      lock(db, id, i.if_version);
      const { staged, claims } = st(db);
      const s = staged.get(fileId);
      if (!s) return err(422, 'VALIDATION_FAILED', { file_id: 'not_found' });
      if (s.product !== id) return err(409, 'CONFLICT', { file_id: 'other_target' });
      if (/animated/i.test(s.name)) return err(422, 'VALIDATION_FAILED', { file_id: 'animated' });
      if (/huge/i.test(s.name)) return err(422, 'VALIDATION_FAILED', { file_id: 'image_too_large' });
      if (live(db, id, s.kind).length >= PRODUCT_MEDIA_LIMITS[s.kind]) return err(422, 'VALIDATION_FAILED', { [s.kind]: 'limit_reached' });
      if (claims.has(fileId) && claims.get(fileId) !== id) return err(409, 'CONFLICT', { file: 'claimed' });
      const first = s.kind === 'image' && !primaryOf(db, id);
      const pos = live(db, id, s.kind).reduce((n, m) => Math.max(n, m.position + 1), 0);
      const row: Media = { media_id: nid('pm'), file_id: fileId, kind: s.kind, name: s.name, mime: s.mime, bytes: s.bytes, position: pos, is_primary: first, version: 1, created_at: new Date().toISOString(), detached: false };
      rows(db, id).push(row);
      claims.set(fileId, id);
      staged.delete(fileId);
      bump(db, id);
      return { ...receipt(db, id, row.media_id), file_id: fileId, kind: s.kind, reused: false };
    },
  },
  'product.media_detach': {
    preview: (db, i: { product_id: string; media_id: string }) => ({ summary: rows(db, i.product_id).find((m) => m.media_id === i.media_id)?.name ?? '' }),
    execute: (db, i: { product_id: string; media_id: string; if_version: number }) => {
      const m = byId(db, i.product_id, i.media_id);
      lock(db, i.product_id, i.if_version);
      m.detached = true;
      m.version += 1;
      if (m.is_primary) {
        m.is_primary = false;
        const next = live(db, i.product_id, 'image')[0];
        if (next) next.is_primary = true;
      }
      bump(db, i.product_id);
      return receipt(db, i.product_id, m.media_id);
    },
  },
  'product.media_reorder': {
    execute: (db, i: { product_id: string; kind: Kind; media_ids: string[]; if_version: number }) => {
      lock(db, i.product_id, i.if_version);
      const cur = live(db, i.product_id, i.kind);
      const want = new Set(i.media_ids);
      if (want.size !== i.media_ids.length || want.size !== cur.length || cur.some((m) => !want.has(m.media_id))) return err(422, 'VALIDATION_FAILED', { media_ids: 'not_permutation' });
      for (const [n, mid] of i.media_ids.entries()) {
        const m = cur.find((x) => x.media_id === mid)!;
        if (m.position === n) continue;
        m.position = n;
        m.version += 1;
      }
      return { version: bump(db, i.product_id) };
    },
  },
  'product.media_set_primary': {
    execute: (db, i: { product_id: string; media_id: string; if_version: number }) => {
      const m = byId(db, i.product_id, i.media_id);
      lock(db, i.product_id, i.if_version);
      if (m.kind !== 'image') return err(422, 'VALIDATION_FAILED', { media_id: 'not_image' });
      for (const x of live(db, i.product_id, 'image')) x.is_primary = x.media_id === m.media_id;
      bump(db, i.product_id);
      return receipt(db, i.product_id, m.media_id);
    },
  },
};
