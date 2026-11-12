// Tệp đính kèm đơn / đề nghị ở mock (TIP-032d) — mirror `sales/files` của server: tải `record_attachment` khai đích (kiểm quyền ghi cha
// trước khi lưu) → staging riêng của người tải; `file_attach` chỉ nhận staging đúng cha, revision bộ tệp khớp (409 STALE), một tệp một cha;
// gỡ = đánh dấu (CAS version), tệp giữ; chứng từ đã sinh (PDF đề nghị / phiếu thu) chỉ đọc. Mock không kiểm cấu trúc thật: đuôi ngoài danh
// sách → 415 như cổng tải lên; tên chứa "macro" → bị từ chối khi gắn (minh hoạ lỗi kiểm cấu trúc). Seed từ fixture prototype (parity).
import { ApiRequestError, ROLE_DEFS, can, type PermissionKey } from '@appchat/shared';
import ordersFx from '../../../../../../../fixtures/prototype-parity/orders.json';
import invoicesFx from '../../../../../../../fixtures/prototype-parity/invoices.json';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';
import { ME } from './customers';
import { NAMES } from './orders';
import { findOrder } from './orders';
import { find as findInvoice, visible as invoiceVisible } from './invoices';

type ParentType = 'order' | 'invoice';
type Kind = 'user_attachment' | 'generated_invoice' | 'generated_receipt';
interface Link {
  id: string;
  file_id: string;
  name: string;
  mime: string;
  bytes: number;
  created_at: string;
  created_by: string | null;
  kind: Kind;
  version: number;
  detached: boolean;
}
interface Staged {
  parent: string;
  name: string;
  mime: string;
  bytes: number;
}

const ALLOWED = /\.(pdf|docx|xlsx|png|jpe?g|webp|txt|csv)$/i;
const MIME: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain', csv: 'text/csv', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const KB = (s: string) => Math.round(Number.parseFloat(s || '0') * 1024);
const at = (d: string) => `${d}T09:00:00+07:00`;

const links = new Map<string, Link[]>();
const revisions = new Map<string, number>();
const staged = new Map<string, Staged>();
const claims = new Map<string, string>();
let seq = 0;
const nid = (p: string) => `${p}_${(++seq).toString(36)}`;
const key = (t: ParentType, id: string) => `${t}:${id}`;

/** Seed theo fixture: tệp người dùng → liên kết gỡ được; PDF đề nghị của hệ thống → chứng từ đã sinh (đề nghị) / bỏ qua (đơn). */
function seeded(t: ParentType, id: string): Link[] {
  const k = key(t, id);
  if (links.has(k)) return links.get(k)!;
  const fx = t === 'order' ? (id === ordersFx.orders[0]!.id ? ordersFx.files : []) : id === invoicesFx.invoices[2]!.id ? invoicesFx.files : [];
  const rows = fx.map((f, n): Link => {
    const gen = f.by === 'system';
    const file_id = `file_seed_${t}_${n}`;
    claims.set(file_id, k);
    return { id: gen ? '' : `att_seed_${t}_${n}`, file_id, name: f.name, mime: MIME[f.ext] ?? 'application/octet-stream', bytes: KB(f.size) || 120 * 1024, created_at: at(f.at), created_by: gen ? null : f.by === 'customer' ? 'u_tram' : (Object.entries(NAMES).find(([, v]) => v === f.by)?.[0] ?? ME), kind: gen ? (t === 'invoice' ? 'generated_invoice' : 'generated_receipt') : 'user_attachment', version: 1, detached: false };
  });
  links.set(k, rows);
  return rows;
}

const err = (status: number, code: string, fields: Record<string, string>): never => {
  throw new ApiRequestError(status, { code: code as never, message: Object.values(fields)[0] ?? code, fields });
};

const perm = (db: MockDb, p: PermissionKey) => can({ userId: ME, isOwner: db.role === 'owner', permissions: new Set(ROLE_DEFS[db.role].permissions), scope: ROLE_DEFS[db.role].scope, teamIds: [] }, p);

/** Cha đọc được theo scope hiện hành (404 nếu không) + còn ghi được không. */
function parent(db: MockDb, t: ParentType, id: string): { writable: boolean } {
  if (t === 'order') {
    findOrder(db, id);
    return { writable: perm(db, 'order.manage') };
  }
  const i = findInvoice(db, id);
  if (!invoiceVisible(db, i)) err(404, 'NOT_FOUND', { invoice_id: 'not_found' });
  return { writable: perm(db, 'invoice.manage') };
}

/** `POST /v1/files` purpose record_attachment (mock-transport gọi): kiểm đích + quyền ghi TRƯỚC khi nhận tệp. */
export function stageRecordFile(db: MockDb, fileId: string, f: { name: string; size: number; type: string }, fields: Record<string, string> = {}) {
  const t = fields.parent_type as ParentType;
  const id = fields.parent_id ?? '';
  if ((t !== 'order' && t !== 'invoice') || !id) err(422, 'VALIDATION_FAILED', { parent: 'required' });
  if (!parent(db, t, id).writable) err(403, 'FORBIDDEN', { permission: `${t}.manage` });
  if (!ALLOWED.test(f.name)) err(415, 'VALIDATION_FAILED', { file: 'type_not_allowed' });
  staged.set(fileId, { parent: key(t, id), name: f.name, mime: f.type || MIME[f.name.split('.').pop()!.toLowerCase()] || 'application/octet-stream', bytes: f.size });
}

/** Tệp riêng của bản ghi (đã gắn / chứng từ) → nội dung minh hoạ cho "Mở"; null = không phải tệp bản ghi. */
export function recordFileBlob(path: string): Blob | null {
  const m = path.match(/^\/files\/([^/]+)$/);
  if (!m) return null;
  for (const rows of links.values()) {
    const f = rows.find((r) => r.file_id === m[1] && !r.detached);
    if (f) return new Blob([`Tệp mock: ${f.name}`], { type: f.mime });
  }
  return null;
}

const out = (rows: Link[], canDetach: boolean) =>
  rows.filter((r) => !r.detached).map((r) => ({
    attachment_id: r.kind === 'user_attachment' ? r.id : null,
    file_id: r.file_id,
    name: r.name,
    mime: r.mime,
    bytes: r.bytes,
    created_at: r.created_at,
    created_by: r.created_by,
    created_by_name: r.created_by ? (NAMES[r.created_by] ?? '') : '',
    kind: r.kind,
    version: r.kind === 'user_attachment' ? r.version : null,
    available: true,
    can_detach: canDetach && r.kind === 'user_attachment',
  }));

type Src = { kind: 'target_upload_handle'; file_id: string } | { kind: 'assistant_artifact_ref'; artifact_id: string; revision: number };

function handlers(t: ParentType): Record<string, MockHandler> {
  const idOf = (i: Record<string, unknown>) => i[`${t}_id`] as string;
  return {
    [`${t}.files_list`]: {
      execute: (db, i: Record<string, unknown>) => {
        const id = idOf(i);
        const { writable } = parent(db, t, id);
        const rows = seeded(t, id);
        const gen = out(rows.filter((r) => r.kind !== 'user_attachment'), false);
        const user = out(rows.filter((r) => r.kind === 'user_attachment').sort((a, b) => b.created_at.localeCompare(a.created_at)), writable);
        return { files: [...gen, ...user], revision: revisions.get(key(t, id)) ?? 0, can_attach: writable, next_cursor: null };
      },
    },
    [`${t}.file_attach`]: {
      preview: (db, i: Record<string, unknown> & { source: Src }) => {
        parent(db, t, idOf(i));
        const s = i.source.kind === 'target_upload_handle' ? staged.get(i.source.file_id) : undefined;
        return { summary: s?.name ?? '' };
      },
      execute: (db, i: Record<string, unknown> & { source: Src; if_revision: number }) => {
        const id = idOf(i);
        const k = key(t, id);
        if (!parent(db, t, id).writable) err(403, 'SCOPE_FORBIDDEN', { parent: 'read_only' });
        if (i.source.kind !== 'target_upload_handle') return err(422, 'VALIDATION_FAILED', { source: 'artifact_copy_unavailable' });
        const fileId = i.source.file_id;
        const rows = seeded(t, id);
        const live = rows.find((r) => r.file_id === fileId && !r.detached);
        if (live) return { attachment_id: live.id, file_id: fileId, version: live.version, revision: revisions.get(k) ?? 0, reused: true };
        const s = staged.get(fileId);
        if (!s) return err(422, 'VALIDATION_FAILED', { file_id: 'not_found' });
        if (s.parent !== k) return err(409, 'CONFLICT', { file_id: 'other_target' });
        if ((revisions.get(k) ?? 0) !== i.if_revision) return err(409, 'STALE_VERSION', { if_revision: 'changed' });
        if (/macro/i.test(s.name)) return err(422, 'VALIDATION_FAILED', { file_id: 'macro' });
        if (claims.has(fileId) && claims.get(fileId) !== k) return err(409, 'CONFLICT', { file: 'claimed' });
        const row: Link = { id: nid('att'), file_id: fileId, name: s.name, mime: s.mime, bytes: s.bytes, created_at: new Date().toISOString(), created_by: ME, kind: 'user_attachment', version: 1, detached: false };
        rows.push(row);
        claims.set(fileId, k);
        staged.delete(fileId);
        const revision = (revisions.get(k) ?? 0) + 1;
        revisions.set(k, revision);
        return { attachment_id: row.id, file_id: fileId, version: 1, revision, reused: false };
      },
    },
    [`${t}.file_detach`]: {
      preview: (db, i: Record<string, unknown> & { attachment_id: string }) => {
        parent(db, t, idOf(i));
        return { summary: seeded(t, idOf(i)).find((r) => r.id === i.attachment_id)?.name ?? '' };
      },
      execute: (db, i: Record<string, unknown> & { attachment_id: string; if_version: number }) => {
        const id = idOf(i);
        const k = key(t, id);
        if (!parent(db, t, id).writable) err(403, 'SCOPE_FORBIDDEN', { parent: 'read_only' });
        const row = seeded(t, id).find((r) => r.id === i.attachment_id && r.kind === 'user_attachment');
        if (!row) return err(404, 'NOT_FOUND', { attachment_id: 'not_found' });
        if (row.detached) return err(409, 'CONFLICT', { attachment_id: 'detached' });
        if (row.version !== i.if_version) return err(409, 'STALE_VERSION', { if_version: 'changed' });
        row.detached = true;
        row.version += 1;
        const revision = (revisions.get(k) ?? 0) + 1;
        revisions.set(k, revision);
        return { attachment_id: row.id, revision };
      },
    },
  };
}

export const recordFileHandlers: Record<string, MockHandler> = { ...handlers('order'), ...handlers('invoice') };
