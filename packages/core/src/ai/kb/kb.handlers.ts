// Action kho tri thức (Blueprint §3.4 `kb.*`, rag §1–5): thêm nguồn (tệp đã tải / URL / văn bản) → `pending` + đẩy `kb-ingest` sau
// commit; sửa thư mục / thẻ / visibility (undo 24h); xoá mềm (undo 30 ngày — giữ đoạn, agent thôi dùng vì lọc `deleted_at`);
// học lại một / tất cả. Trùng tệp (sha256) với nguồn còn sống → 409 kèm id nguồn cũ. TIP-020b: visibility bỏ trống kế thừa thư mục
// (source-policy.ts); nguồn đồng bộ catalog không sửa / xoá / hoàn tác được (sửa sản phẩm gốc); thư mục ở folder.handlers.ts.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, kbAddSource, kbRefreshSource, kbRemoveSource, kbUpdateSource } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { kindOf } from './parse';
import { KbIngestQueue } from './kb.queue';
import { addPreview, refreshPreview, removePreview, updatePreview } from './previews/kb.handlers.preview';
import { assertEditable, folderVisibility, resolveVisibility } from './source-policy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = (v: string | undefined | null, field: string) => {
  if (v && !UUID.test(v)) throw new AppError('NOT_FOUND', 404, { [field]: 'not_found' });
  return v ?? null;
};

async function liveSource(tx: TenantTx, id: string) {
  const s = UUID.test(id) ? await tx.kbSource.findUnique({ where: { id } }) : null;
  if (!s || s.deletedAt) throw new AppError('NOT_FOUND', 404, { source_id: 'not_found' });
  return s;
}

const tagsOf = (t: string[] | undefined) => [...new Set((t ?? []).map((x) => x.trim()).filter(Boolean))];

@Injectable()
@ActionHandler('kb.add_source')
export class KbAddSourceHandler implements Handler<ActionInput<typeof kbAddSource>, { source_id: string }> {
  constructor(
    @Optional() @Inject(KbIngestQueue) private readonly queue: KbIngestQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof kbAddSource>, tx: TenantTx): Promise<HandlerOutcome<{ source_id: string }>> {
    const given = [input.file_id, input.url, input.text].filter((x) => x !== undefined).length;
    if (given > 1) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'one_of_file_url_text' });
    const folderId = uuid(input.folder_id, 'folder_id');
    const visibility = resolveVisibility(input.visibility, await folderVisibility(tx, folderId));
    let kind = 'text';
    let origin: 'upload' | 'url' | 'text' = 'text';
    let size = 0;
    let sha256: string | null = null;
    let learn = input.learn;
    if (input.file_id) {
      const f = UUID.test(input.file_id) ? await tx.file.findUnique({ where: { id: input.file_id } }) : null;
      if (!f) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
      const dup = f.sha256 ? await tx.kbSource.findFirst({ where: { sha256: f.sha256, deletedAt: null }, select: { id: true } }) : null;
      if (dup) throw new AppError('CONFLICT', 409, { file_id: 'duplicate', source_id: dup.id });
      origin = 'upload';
      size = Number(f.size);
      sha256 = f.sha256;
      // Định dạng chưa đọc được (ảnh, video, pptx) → chỉ lưu tài liệu, không học (prototype vẫn cho tải lên).
      const k = kindOf(f.name, f.mime);
      kind = k ?? (f.name.toLowerCase().split('.').pop() || 'file');
      if (!k) learn = false;
      await tx.file.update({ where: { id: f.id }, data: { confirmed: true } });
    } else if (input.url) {
      origin = 'url';
      kind = 'url';
    } else if (input.text !== undefined) {
      size = Buffer.byteLength(input.text);
    } else {
      // Mock FE cũ chỉ ghi tên → tài liệu rỗng không học được.
      learn = false;
      kind = kindOf(input.name) ?? 'txt';
      origin = 'upload';
    }
    const id = uuidv7();
    const now = this.clock.now();
    await tx.kbSource.create({
      data: {
        id, folderId, origin, kind, name: input.name.trim(), tags: tagsOf(input.tags), visibility, fileId: input.file_id ?? null,
        url: input.url ?? null, body: input.text ?? null, sha256, learn, sizeBytes: BigInt(size), createdBy: ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null), createdAt: now,
      },
    });
    const queue = this.queue;
    return {
      result: { source_id: id },
      after: { id },
      ...(queue ? { afterCommit: () => queue.push(ctx.workspaceId, [{ id, seq: 1 }]) } : {}),
    };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof kbAddSource>, tx: TenantTx) {
    return addPreview(tx, input);
  }
}

@Injectable()
@ActionHandler('kb.update_source')
export class KbUpdateSourceHandler implements Handler<ActionInput<typeof kbUpdateSource>, { ok: boolean }> {
  async execute(_ctx: ActionContext, input: ActionInput<typeof kbUpdateSource>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const s = await liveSource(tx, input.source_id);
    assertEditable(s);
    const folderId = input.folder_id === undefined ? undefined : uuid(input.folder_id, 'folder_id');
    // Đổi thư mục giữ visibility hiện có (snapshot) — không tự publish lại theo mặc định thư mục mới.
    if (folderId) await folderVisibility(tx, folderId);
    const before = { name: s.name, folder_id: s.folderId, tags: s.tags, visibility: s.visibility, starred: s.starred };
    const data = {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(folderId !== undefined ? { folderId } : {}),
      ...(input.tags !== undefined ? { tags: tagsOf(input.tags) } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.starred !== undefined ? { starred: input.starred } : {}),
    };
    await tx.kbSource.update({ where: { id: s.id }, data });
    return { result: { ok: true }, before: { id: s.id, ...before }, after: { id: s.id, ...data } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; name: string; folder_id: string | null; tags: string[]; visibility: 'public' | 'internal'; starred: boolean };
    const cur = await tx.kbSource.findUnique({ where: { id: b.id }, select: { origin: true, productId: true } });
    if (cur) assertEditable(cur);
    await tx.kbSource.updateMany({ where: { id: b.id, deletedAt: null }, data: { name: b.name, folderId: b.folder_id, tags: b.tags, visibility: b.visibility, starred: b.starred } });
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof kbUpdateSource>, tx: TenantTx) {
    return updatePreview(tx, input);
  }
}

@Injectable()
@ActionHandler('kb.remove_source')
export class KbRemoveSourceHandler implements Handler<ActionInput<typeof kbRemoveSource>, { ok: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof kbRemoveSource>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const s = await liveSource(tx, input.source_id);
    assertEditable(s);
    await tx.kbSource.update({ where: { id: s.id }, data: { deletedAt: this.clock.now() } });
    return { result: { ok: true }, before: { id: s.id, deleted_at: null }, after: { id: s.id, deleted: true } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const { id } = log.before as { id: string };
    const s = await tx.kbSource.findUnique({ where: { id }, select: { sha256: true, origin: true, productId: true } });
    if (s) assertEditable(s);
    // Trong lúc đã xoá, cùng tệp được tải lên lại → khôi phục sẽ trùng unique sha256.
    if (s?.sha256 && (await tx.kbSource.findFirst({ where: { sha256: s.sha256, deletedAt: null, NOT: { id } }, select: { id: true } }))) throw new AppError('CONFLICT', 409, { source_id: 'duplicate' });
    await tx.kbSource.update({ where: { id }, data: { deletedAt: null } });
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof kbRemoveSource>, tx: TenantTx) {
    return removePreview(tx, input);
  }
}

@Injectable()
@ActionHandler('kb.refresh_source')
export class KbRefreshSourceHandler implements Handler<ActionInput<typeof kbRefreshSource>, { queued: number }> {
  constructor(
    @Optional() @Inject(KbIngestQueue) private readonly queue: KbIngestQueue | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof kbRefreshSource>, tx: TenantTx): Promise<HandlerOutcome<{ queued: number }>> {
    const ids = input.source_id === 'all' ? (await tx.kbSource.findMany({ where: { deletedAt: null, learn: true }, select: { id: true } })).map((x) => x.id) : [(await liveSource(tx, input.source_id)).id];
    const now = this.clock.now();
    // `learn=true` khi học lại một nguồn đã tắt học (người dùng bấm "Học lại" chủ động) — trừ định dạng không đọc được.
    if (input.source_id !== 'all') {
      const s = await tx.kbSource.findUniqueOrThrow({ where: { id: ids[0]! } });
      if (!s.learn && (s.body !== null || s.url !== null || (s.fileId && kindOf(s.name)))) await tx.kbSource.update({ where: { id: s.id }, data: { learn: true } });
    }
    await tx.kbSource.updateMany({ where: { id: { in: ids } }, data: { status: 'pending', error: null, refreshedAt: now, ingestSeq: { increment: 1 } } });
    const jobs = (await tx.kbSource.findMany({ where: { id: { in: ids } }, select: { id: true, ingestSeq: true } })).map((x) => ({ id: x.id, seq: x.ingestSeq }));
    const queue = this.queue;
    return { result: { queued: ids.length }, after: { ids }, ...(queue && ids.length ? { afterCommit: () => queue.push(ctx.workspaceId, jobs) } : {}) };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof kbRefreshSource>, tx: TenantTx) {
    return refreshPreview(tx, input);
  }
}
