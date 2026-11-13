// product.media_attach / detach / reorder / set_primary / list (TIP-027b §1.3): quyền action catalog.manage / catalog.view (executor kiểm),
// không cấp cho agent (như product.create / update). Gắn: prepare ngoài transaction (ý định bền → sao chép / kiểm cấu trúc cô lập), xem
// trước nêu đúng tệp + sản phẩm, artifact Trợ lý ràng revision + digest nguồn vào xác nhận. Không undo (gỡ là thao tác riêng có cảnh báo;
// tệp giữ cho dọn tệp / quên khách). Sự kiện `product.media_changed` chỉ id + version.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, productMediaAttach, productMediaDetach, productMediaList, productMediaReorder, productMediaSetPrimary } from '@appchat/actions';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { preview } from '../../kernel/actions/preview-kit';
import { CLOCK, type Clock } from '../../kernel/clock';
import { FilesService } from '../../kernel/files/files.service';
import { locateSource, sourceFact } from '../../kernel/files/artifact-copy';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { actorUserId } from '../../crm/public';
import { attachMedia, prepareAttach, type Prepared } from './attach';
import { detachMedia, reorderMedia, setPrimaryMedia } from './edit';
import { listMedia, readableProduct } from './read';
import { mediaById } from './repository';
import { productAttachmentTarget } from './source';

type AttachIn = ActionInput<typeof productMediaAttach>;
type Change = 'attached' | 'detached' | 'reordered' | 'primary';

const me = (ctx: ActionContext) => {
  const u = actorUserId(ctx);
  if (!u) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
  return u;
};
const changed = (productId: string, version: number, change: Change) => [{ topic: 'product.media_changed', payload: { product_id: productId, version, change } }];

@Injectable()
@ActionHandler('product.media_attach')
export class ProductMediaAttachHandler implements Handler<AttachIn, unknown> {
  constructor(
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver | null,
    @Optional() @Inject(FilesService) private readonly files: FilesService | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, i: AttachIn): Promise<Prepared | undefined> {
    if (!this.tenants || !this.files) {
      if (i.source.kind === 'assistant_artifact_ref') throw new AppError('VALIDATION_FAILED', 422, { source: 'artifact_copy_unavailable' });
      return undefined;
    }
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'product-media'));
    return prepareAttach(db, this.files, ctx, me(ctx), i, () => this.clock.now(), (tx) => productAttachmentTarget.assertWritable(tx, ctx.authz, i.product_id));
  }

  async execute(ctx: ActionContext, i: AttachIn, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<unknown>> {
    const r = await attachMedia(ctx, tx, me(ctx), i, prepared as Prepared | undefined, this.clock.now());
    return { result: r, noUndo: true, ...(r.reused ? {} : { events: changed(i.product_id, r.version, 'attached') }) };
  }

  async preview(ctx: ActionContext, i: AttachIn, tx: TenantTx) {
    const p = await readableProduct(tx, i.product_id);
    const u = me(ctx);
    if (i.source.kind === 'assistant_artifact_ref') {
      const loc = await locateSource(tx, u, ctx.runId, i.source);
      const f = await tx.file.findUnique({ where: { id: loc.fileId }, select: { size: true } });
      return preview('write', `${p.code} · ${loc.name}`, { changes: [{ entity: 'product_media', after: { file: loc.name, bytes: Number(f?.size ?? 0), source: 'assistant_copy' } }] });
    }
    const f = await tx.file.findUnique({ where: { id: i.source.file_id }, select: { name: true, size: true, uploadedBy: true } });
    if (!f || f.uploadedBy !== u) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
    return preview('write', `${p.code} · ${f.name}`, { changes: [{ entity: 'product_media', after: { file: f.name, bytes: Number(f.size) } }] });
  }

  async bindPreview(ctx: ActionContext, i: AttachIn, tx: TenantTx): Promise<Record<string, string>> {
    const u = actorUserId(ctx);
    if (i.source.kind !== 'assistant_artifact_ref' || !u) return {};
    return sourceFact(i.source, (await locateSource(tx, u, ctx.runId, i.source)).digest);
  }
}

@Injectable()
@ActionHandler('product.media_detach')
export class ProductMediaDetachHandler implements Handler<ActionInput<typeof productMediaDetach>, unknown> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof productMediaDetach>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const r = await detachMedia(tx, actorUserId(ctx) ?? null, i, this.clock.now());
    return { result: r, noUndo: true, events: changed(i.product_id, r.version, 'detached') };
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof productMediaDetach>, tx: TenantTx) {
    const p = await readableProduct(tx, i.product_id);
    const m = await mediaById(tx, i.product_id, i.media_id);
    if (m.detached_at) throw new AppError('NOT_FOUND', 404, { media_id: 'not_found' });
    const f = await tx.file.findUnique({ where: { id: m.file_id }, select: { name: true } });
    return preview('delete', `${p.code} · ${f?.name ?? ''}`, { changes: [{ entity: 'product_media', id: m.id, before: { file: f?.name ?? '' } }], warnings: ['file_kept'] });
  }
}

@Injectable()
@ActionHandler('product.media_reorder')
export class ProductMediaReorderHandler implements Handler<ActionInput<typeof productMediaReorder>, unknown> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, i: ActionInput<typeof productMediaReorder>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const r = await reorderMedia(tx, i, this.clock.now());
    return { result: r, noUndo: true, events: changed(i.product_id, r.version, 'reordered') };
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof productMediaReorder>, tx: TenantTx) {
    const p = await readableProduct(tx, i.product_id);
    return preview('write', `${p.code} · ${i.media_ids.length}`, { changes: [{ entity: 'product_media', after: { kind: i.kind, order: i.media_ids.length } }] });
  }
}

@Injectable()
@ActionHandler('product.media_set_primary')
export class ProductMediaSetPrimaryHandler implements Handler<ActionInput<typeof productMediaSetPrimary>, unknown> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, i: ActionInput<typeof productMediaSetPrimary>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const r = await setPrimaryMedia(tx, i, this.clock.now());
    return { result: r, noUndo: true, events: changed(i.product_id, r.version, 'primary') };
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof productMediaSetPrimary>, tx: TenantTx) {
    const p = await readableProduct(tx, i.product_id);
    const m = await mediaById(tx, i.product_id, i.media_id);
    const f = await tx.file.findUnique({ where: { id: m.file_id }, select: { name: true } });
    return preview('write', `${p.code} · ${f?.name ?? ''}`, { changes: [{ entity: 'product_media', id: m.id, after: { is_primary: true } }] });
  }
}

@Injectable()
@ActionHandler('product.media_list')
export class ProductMediaListHandler implements Handler<ActionInput<typeof productMediaList>, unknown> {
  async execute(ctx: ActionContext, i: ActionInput<typeof productMediaList>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    return { result: await listMedia(tx, ctx.authz, i.product_id, i.kind) };
  }
}

export const PRODUCT_MEDIA_HANDLERS = [ProductMediaAttachHandler, ProductMediaDetachHandler, ProductMediaReorderHandler, ProductMediaSetPrimaryHandler, ProductMediaListHandler] as const;
