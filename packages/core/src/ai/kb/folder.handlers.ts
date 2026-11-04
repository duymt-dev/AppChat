// Thư mục kho tri thức (Blueprint §3.4 `kb.folder.*`, rag §3 — TIP-020 tạo, TIP-020b sửa / xoá). Tên không trùng toàn kho (kiểm trước +
// unique index chốt khi đồng thời), cha – con không vòng, sửa / xoá khoá dòng + CAS version. Visibility thư mục = mặc định cho nguồn MỚI
// (nguồn đã có giữ snapshot — không tự publish lại). Xoá chỉ thư mục rỗng (HAS_DEPENDENCIES kèm số đếm) — không cascade mất tài liệu;
// hoàn tác xoá tạo lại đúng id / tên / cha / visibility; hoàn tác sửa trả về trạng thái trước (version tăng tiếp).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, kbFolderCreate, kbFolderDelete, kbFolderUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview, removed, updated } from '../../kernel/actions/preview-kit';
import { assertNameFree, assertParent, dependents, duplicateFromDb, liveFolder, lockFolder } from './folder.repo';

type Snap = { id: string; name: string; parent_id: string | null; visibility: 'public' | 'internal'; sort: number; version: number; created_at: string };
const snap = (f: { id: string; name: string; parentId: string | null; visibility: 'public' | 'internal'; sort: number; version: number; createdAt: Date }): Snap => ({
  id: f.id, name: f.name, parent_id: f.parentId, visibility: f.visibility, sort: f.sort, version: f.version, created_at: f.createdAt.toISOString(),
});

async function blockIfUsed(tx: TenantTx, id: string) {
  const d = await dependents(tx, id);
  if (d.sources || d.trashed || d.children) throw new AppError('HAS_DEPENDENCIES', 409, { sources: String(d.sources), trashed: String(d.trashed), children: String(d.children) });
  return d;
}

@Injectable()
@ActionHandler('kb.folder.create')
export class KbFolderCreateHandler implements Handler<ActionInput<typeof kbFolderCreate>, { folder_id: string; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, i: ActionInput<typeof kbFolderCreate>, tx: TenantTx): Promise<HandlerOutcome<{ folder_id: string; version: number }>> {
    const name = i.name.trim();
    await assertNameFree(tx, name);
    await assertParent(tx, i.parent_id ?? null);
    const sort = (await tx.kbFolder.aggregate({ _max: { sort: true } }))._max.sort ?? -1;
    const id = uuidv7();
    await tx.kbFolder.create({ data: { id, name, parentId: i.parent_id ?? null, visibility: i.visibility ?? 'public', sort: sort + 1, createdAt: this.clock.now() } }).catch(duplicateFromDb);
    return { result: { folder_id: id, version: 1 }, after: { id, name } };
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof kbFolderCreate>, tx: TenantTx): Promise<ActionPreview> {
    const name = i.name.trim();
    await assertNameFree(tx, name);
    await assertParent(tx, i.parent_id ?? null);
    return preview('write', name, { changes: [created('kb_folder', { name, ...(i.visibility ? { visibility: i.visibility } : {}), ...(i.parent_id ? { parent_id: i.parent_id } : {}) })] });
  }
}

@Injectable()
@ActionHandler('kb.folder.update')
export class KbFolderUpdateHandler implements Handler<ActionInput<typeof kbFolderUpdate>, { folder_id: string; version: number }> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof kbFolderUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ folder_id: string; version: number }>> {
    const f = await lockFolder(tx, i.folder_id, i.if_version);
    const name = i.name?.trim();
    if (name !== undefined) await assertNameFree(tx, name, f.id);
    if (i.parent_id !== undefined) await assertParent(tx, i.parent_id, f.id);
    const data = {
      ...(name !== undefined ? { name } : {}),
      ...(i.visibility !== undefined ? { visibility: i.visibility } : {}),
      ...(i.parent_id !== undefined ? { parentId: i.parent_id } : {}),
    };
    const row = await tx.kbFolder.update({ where: { id: f.id }, data: { ...data, version: { increment: 1 } } }).catch(duplicateFromDb);
    return { result: { folder_id: f.id, version: row.version }, before: snap(f), after: { id: f.id, ...data, version: row.version } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as Snap;
    const f = await lockFolder(tx, b.id);
    await assertNameFree(tx, b.name, f.id);
    if (b.parent_id) await assertParent(tx, b.parent_id, f.id);
    await tx.kbFolder.update({ where: { id: f.id }, data: { name: b.name, parentId: b.parent_id, visibility: b.visibility, version: { increment: 1 } } }).catch(duplicateFromDb);
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof kbFolderUpdate>, tx: TenantTx): Promise<ActionPreview> {
    const f = await liveFolder(tx, i.folder_id);
    if (i.if_version !== undefined && i.if_version !== f.version) throw new AppError('STALE_VERSION', 409, { version: String(f.version) });
    const name = i.name?.trim();
    if (name !== undefined) await assertNameFree(tx, name, f.id);
    if (i.parent_id !== undefined) await assertParent(tx, i.parent_id, f.id);
    const d = await dependents(tx, f.id);
    return preview('write', f.name, {
      count: d.sources,
      changes: updated('kb_folder', f.id, { name: f.name, visibility: f.visibility, parent_id: f.parentId }, { name, visibility: i.visibility, parent_id: i.parent_id }),
      // Đổi mặc định thư mục chỉ áp cho nguồn thêm sau — nguồn hiện có giữ visibility của chúng.
      ...(i.visibility !== undefined && i.visibility !== f.visibility && d.sources ? { warnings: ['existing_sources_keep_visibility'] } : {}),
    });
  }
}

@Injectable()
@ActionHandler('kb.folder.delete')
export class KbFolderDeleteHandler implements Handler<ActionInput<typeof kbFolderDelete>, { ok: boolean }> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof kbFolderDelete>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const f = await lockFolder(tx, i.folder_id, i.if_version);
    await blockIfUsed(tx, f.id);
    await tx.kbFolder.delete({ where: { id: f.id } });
    return { result: { ok: true }, before: snap(f), after: { id: f.id, deleted: true } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as Snap;
    if (await tx.kbFolder.findUnique({ where: { id: b.id }, select: { id: true } })) return;
    await assertNameFree(tx, b.name);
    const parent = b.parent_id && (await tx.kbFolder.findUnique({ where: { id: b.parent_id }, select: { id: true } })) ? b.parent_id : null;
    await tx.kbFolder
      .create({ data: { id: b.id, name: b.name, parentId: parent, visibility: b.visibility, sort: b.sort, version: b.version + 1, createdAt: new Date(b.created_at) } })
      .catch(duplicateFromDb);
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof kbFolderDelete>, tx: TenantTx): Promise<ActionPreview> {
    const f = await liveFolder(tx, i.folder_id);
    if (i.if_version !== undefined && i.if_version !== f.version) throw new AppError('STALE_VERSION', 409, { version: String(f.version) });
    await blockIfUsed(tx, f.id);
    return preview('delete', f.name, { count: 0, changes: [removed('kb_folder', f.id, { name: f.name, visibility: f.visibility })] });
  }
}
