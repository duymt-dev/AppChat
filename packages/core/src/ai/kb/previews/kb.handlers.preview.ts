// Preview kho tri thức (TIP-023b R2.8): thêm nguồn → tên · loại · thư mục · học (tệp trùng → 409, thư mục lạ → 404, nhiều nguồn → 422 như
// execute); sửa → trước / sau chỉ trường đổi; xoá → tên + cảnh báo agent thôi dùng; học lại → số nguồn; thư mục mới → tên (trùng → 409).
// Chỉ đọc (không xác nhận tệp, không đẩy ingest).
import { AppError, foldText } from '@appchat/shared';
import type { ActionInput, ActionPreview, kbAddSource, kbFolderCreate, kbRefreshSource, kbRemoveSource, kbUpdateSource } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { kindOf } from '../parse';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tagsOf = (t: string[] | undefined) => [...new Set((t ?? []).map((x) => x.trim()).filter(Boolean))];

async function folderName(tx: TenantTx, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const f = UUID.test(id) ? await tx.kbFolder.findUnique({ where: { id }, select: { name: true } }) : null;
  if (!f) throw new AppError('NOT_FOUND', 404, { folder_id: 'not_found' });
  return f.name;
}

async function liveSource(tx: TenantTx, id: string) {
  const s = UUID.test(id) ? await tx.kbSource.findUnique({ where: { id } }) : null;
  if (!s || s.deletedAt) throw new AppError('NOT_FOUND', 404, { source_id: 'not_found' });
  return s;
}

export async function addPreview(tx: TenantTx, i: ActionInput<typeof kbAddSource>): Promise<ActionPreview> {
  if ([i.file_id, i.url, i.text].filter((x) => x !== undefined).length > 1) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'one_of_file_url_text' });
  const folder = await folderName(tx, i.folder_id);
  let kind = i.url ? 'url' : 'text';
  let learn = i.learn;
  if (i.file_id) {
    const f = UUID.test(i.file_id) ? await tx.file.findUnique({ where: { id: i.file_id } }) : null;
    if (!f) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const dup = f.sha256 ? await tx.kbSource.findFirst({ where: { sha256: f.sha256, deletedAt: null }, select: { id: true } }) : null;
    if (dup) throw new AppError('CONFLICT', 409, { file_id: 'duplicate', source_id: dup.id });
    const k = kindOf(f.name, f.mime);
    kind = k ?? (f.name.toLowerCase().split('.').pop() || 'file');
    if (!k) learn = false;
  } else if (!i.url && i.text === undefined) {
    learn = false;
    kind = kindOf(i.name) ?? 'txt';
  }
  return preview('write', i.name.trim(), {
    changes: [created('kb_source', { name: i.name.trim(), kind, folder, tags: tagsOf(i.tags), visibility: i.visibility, learn })],
    ...(learn ? {} : { warnings: ['not_learned'] }),
  });
}

export async function updatePreview(tx: TenantTx, i: ActionInput<typeof kbUpdateSource>): Promise<ActionPreview> {
  const s = await liveSource(tx, i.source_id);
  const folder = i.folder_id === undefined ? undefined : await folderName(tx, i.folder_id || null);
  const cur = { name: s.name, folder: await folderName(tx, s.folderId), tags: s.tags, visibility: s.visibility, starred: s.starred };
  return preview('write', s.name, { changes: updated('kb_source', s.id, cur, { name: i.name?.trim(), folder, tags: i.tags === undefined ? undefined : tagsOf(i.tags), visibility: i.visibility, starred: i.starred }) });
}

export async function removePreview(tx: TenantTx, i: ActionInput<typeof kbRemoveSource>): Promise<ActionPreview> {
  const s = await liveSource(tx, i.source_id);
  return preview('delete', s.name, { changes: [removed('kb_source', s.id, { name: s.name, kind: s.kind, status: s.status })], warnings: ['agents_stop_using'] });
}

export async function refreshPreview(tx: TenantTx, i: ActionInput<typeof kbRefreshSource>): Promise<ActionPreview> {
  if (i.source_id === 'all') {
    const n = await tx.kbSource.count({ where: { deletedAt: null, learn: true } });
    return preview('write', `${n}`, { count: n, changes: [{ entity: 'kb_source', after: { status: 'pending' } }] });
  }
  const s = await liveSource(tx, i.source_id);
  return preview('write', s.name, { count: 1, changes: updated('kb_source', s.id, { status: s.status }, { status: 'pending' }) });
}

export async function folderPreview(tx: TenantTx, i: ActionInput<typeof kbFolderCreate>): Promise<ActionPreview> {
  const name = i.name.trim();
  if ((await tx.kbFolder.findMany({ select: { name: true } })).some((f) => foldText(f.name) === foldText(name))) throw new AppError('CONFLICT', 409, { name: 'duplicate' });
  return preview('write', name, { changes: [created('kb_folder', { name })] });
}
