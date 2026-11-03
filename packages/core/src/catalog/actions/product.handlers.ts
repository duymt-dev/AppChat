// product.create · update · archive (Blueprint §3.4 catalog; COMMERCE §2). Ghi trong transaction của executor; event
// `product.changed` cùng transaction (outbox) → consumer `catalog-sync` nạp lại nguồn RAG. `update` khoá lạc quan theo
// `version` (concurrency §1 — `if_version` lệch → STALE_VERSION 409); tồn chỉ đổi qua `stock.adjust` / đơn hàng.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, mergeCustomValues, type CustomValues } from '@appchat/shared';
import type { ActionInput, productArchive, productCreate, productUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { nextCode } from '../../kernel/sequence';
import { CrmMembers, actorUserId } from '../../crm/public';
import { categoryByName, checkCustom, componentsByName, fieldRole, liveProduct, recordMovement, syncVariants, writeComponents } from '../services/catalog-write';
import { columnsOf, restoreSnapshot, snapshot, type ProductSnapshot } from '../services/product-columns';
import { archivePreview, createPreview, updatePreview } from './previews/product.handlers.preview';

type CreateIn = ActionInput<typeof productCreate>;
type UpdateIn = ActionInput<typeof productUpdate>;
type Change = 'created' | 'updated' | 'archived' | 'restored';

const changed = (id: string, change: Change) => ({ topic: 'product.changed', payload: { product_id: id, change } });

@Injectable()
@ActionHandler('product.create')
export class ProductCreateHandler implements Handler<CreateIn, { product_id: string; code: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: CreateIn, tx: TenantTx): Promise<HandlerOutcome<{ product_id: string; code: string }>> {
    const now = this.clock.now();
    const me = actorUserId(ctx);
    await checkCustom(tx, input.custom, fieldRole(ctx.authz, await this.members.roleOf(ctx.workspaceId, me)), 'create');
    if (input.type === 'combo' && !input.components?.length) throw new AppError('VALIDATION_FAILED', 422, { components: 'required' });
    const parts = input.type === 'combo' ? await componentsByName(tx, input.components ?? [], null) : [];
    const sku = input.sku?.trim();
    if (sku && (await tx.product.findUnique({ where: { code: sku }, select: { id: true } }))) throw new AppError('CONFLICT', 409, { sku: 'duplicate' });
    const id = uuidv7(now.getTime());
    const code = sku || (await nextCode(tx, 'product'));
    await tx.product.create({
      data: {
        ...columnsOf(input),
        id,
        code,
        name: input.name.trim(),
        type: input.type,
        price: BigInt(input.price),
        unit: input.unit?.trim() || 'Cái',
        categoryId: await categoryByName(tx, input.category, now),
        stock: input.type === 'physical' ? 0 : null,
        attrs: (input.attrs ?? []) as object,
        custom: (input.custom ?? {}) as object,
        createdBy: me,
        createdAt: now,
        updatedAt: now,
      },
    });
    await writeComponents(tx, id, parts);
    if (input.type === 'physical' && input.attrs?.length) await syncVariants(tx, { id, code }, input.attrs, now);
    // Tồn ban đầu → movement `import` (sổ kho là nguồn sự thật; `product.stock` là cache).
    if (input.type === 'physical' && input.stock) await recordMovement(tx, { productId: id, kind: 'import', qty: input.stock, refType: 'product', refId: id, actorId: me }, now);
    return { result: { product_id: id, code }, after: { id }, events: [changed(id, 'created')] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const id = (log.after as { id: string }).id;
    // Đã nằm trong combo khác (FK Restrict) → không xoá được → 409.
    if (await tx.productComponent.findFirst({ where: { childId: id }, select: { productId: true } })) throw new AppError('CONFLICT', 409, { product_id: 'in_use' });
    await tx.product.deleteMany({ where: { id } });
    const now = this.clock.now();
    await writeOutbox(tx, ctx.workspaceId, [{ topic: 'product.changed', payload: { product_id: id, change: 'deleted' } }], now);
  }

  async preview(_ctx: ActionContext, input: CreateIn, tx: TenantTx) {
    return createPreview(tx, input);
  }
}

@Injectable()
@ActionHandler('product.update')
export class ProductUpdateHandler implements Handler<UpdateIn, { product_id: string; version: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: UpdateIn, tx: TenantTx): Promise<HandlerOutcome<{ product_id: string; version: number }>> {
    const p = await liveProduct(tx, input.product_id);
    if (input.if_version !== undefined && input.if_version !== p.version) throw new AppError('STALE_VERSION', 409, { version: String(p.version) });
    const now = this.clock.now();
    const { custom, category, components, attrs, name, price, unit, sku, type, ...rest } = input.patch;
    await checkCustom(tx, custom, fieldRole(ctx.authz, await this.members.roleOf(ctx.workspaceId, actorUserId(ctx))), 'update');
    if (type && type !== p.type) throw new AppError('VALIDATION_FAILED', 422, { 'patch.type': 'immutable' });
    const code = sku?.trim() && sku.trim() !== p.code ? sku.trim() : undefined;
    if (code && (await tx.product.findUnique({ where: { code }, select: { id: true } }))) throw new AppError('CONFLICT', 409, { sku: 'duplicate' });
    const before = await snapshot(tx, p);
    const data = {
      ...columnsOf(rest),
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(price !== undefined ? { price: BigInt(price) } : {}),
      ...(unit !== undefined ? { unit: unit.trim() || p.unit } : {}),
      ...(code ? { code } : {}),
      ...(category !== undefined ? { categoryId: await categoryByName(tx, category, now) } : {}),
      ...(attrs !== undefined ? { attrs } : {}),
      ...(custom !== undefined ? { custom: mergeCustomValues(p.custom as CustomValues, custom) as object } : {}),
    };
    // Khoá lạc quan ngay ở câu UPDATE: hai lần sửa song song cùng version → lần sau 0 dòng → 409.
    const n = await tx.product.updateMany({ where: { id: p.id, version: p.version }, data: { ...data, version: { increment: 1 }, updatedAt: now } });
    if (!n.count) throw new AppError('STALE_VERSION', 409, { version: 'changed' });
    if (components !== undefined && p.type === 'combo') await writeComponents(tx, p.id, await componentsByName(tx, components, p.id));
    if (attrs !== undefined && p.type === 'physical') await syncVariants(tx, { id: p.id, code: code ?? p.code }, attrs, now);
    return {
      result: { product_id: p.id, version: p.version + 1 },
      before,
      after: { id: p.id, price: price ?? String(p.price) },
      events: [changed(p.id, 'updated')],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as ProductSnapshot;
    const now = this.clock.now();
    await restoreSnapshot(tx, b, now);
    await writeOutbox(tx, ctx.workspaceId, [changed(b.id, 'updated')], now);
  }

  async preview(_ctx: ActionContext, input: UpdateIn, tx: TenantTx) {
    return updatePreview(tx, input);
  }
}

@Injectable()
@ActionHandler('product.archive')
export class ProductArchiveHandler implements Handler<ActionInput<typeof productArchive>, { product_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof productArchive>, tx: TenantTx): Promise<HandlerOutcome<{ product_id: string }>> {
    const p = await liveProduct(tx, input.product_id);
    const now = this.clock.now();
    await tx.product.update({ where: { id: p.id }, data: { status: 'archived', deletedAt: now, version: { increment: 1 }, updatedAt: now } });
    return { result: { product_id: p.id }, before: { id: p.id, status: p.status }, after: { id: p.id }, events: [changed(p.id, 'archived')] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; status: 'active' | 'draft' };
    const now = this.clock.now();
    // Trong lúc lưu trữ, mã đã được dùng lại bởi sản phẩm khác không xảy ra (unique code tính cả bản lưu trữ) → khôi phục thẳng.
    await tx.product.update({ where: { id: b.id }, data: { status: b.status, deletedAt: null, version: { increment: 1 }, updatedAt: now } });
    await writeOutbox(tx, ctx.workspaceId, [changed(b.id, 'restored')], now);
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof productArchive>, tx: TenantTx) {
    return archivePreview(tx, input);
  }
}
