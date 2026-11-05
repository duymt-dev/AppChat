// product_variant.create · update · archive (TIP-032b, Blueprint §3.4): biến thể là thực thể riêng. Ghi trong transaction executor; SKU
// unique giữa biến thể chưa lưu trữ (409 có lý do); `update` khoá lạc quan `if_version` (STALE_VERSION 409); lưu trữ giữ tham chiếu lịch
// sử. Hoàn tác 24 giờ: tạo → lưu trữ; sửa / lưu trữ → khôi phục ảnh chụp. Phát `product.changed` (RAG nạp lại mô tả có biến thể).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, productVariantArchive, productVariantCreate, productVariantUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, line, preview, updated } from '../../kernel/actions/preview-kit';
import { uuidv7 } from '../../kernel/ids';
import { liveProduct } from '../services/catalog-write';
import { assertSkuFree, lockVariant, restoreVariant, variantSnap, type VariantSnap } from '../services/variants';

type CreateIn = ActionInput<typeof productVariantCreate>;
type UpdateIn = ActionInput<typeof productVariantUpdate>;
type ArchiveIn = ActionInput<typeof productVariantArchive>;
const changed = (productId: string) => ({ topic: 'product.changed', payload: { product_id: productId, change: 'updated' } });
const priceOf = (p: string | null | undefined) => (p === undefined ? undefined : p === null ? null : BigInt(p));

@Injectable()
@ActionHandler('product_variant.create')
export class VariantCreateHandler implements Handler<CreateIn, { variant_id: string; sku: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: CreateIn, tx: TenantTx): Promise<HandlerOutcome<{ variant_id: string; sku: string }>> {
    const p = await liveProduct(tx, input.product_id);
    await tx.$queryRaw`SELECT 1 FROM product WHERE id = ${p.id}::uuid FOR UPDATE`;
    const sku = input.sku.trim();
    await assertSkuFree(tx, sku, null);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.productVariant.create({ data: { id, productId: p.id, sku, name: input.name.trim(), attrs: (input.attrs ?? {}) as object, price: priceOf(input.price) ?? null, createdAt: now, updatedAt: now } });
    return { result: { variant_id: id, sku }, before: { id }, events: [changed(p.id)] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const { id } = log.before as { id: string };
    await tx.productVariant.updateMany({ where: { id }, data: { status: 'archived', version: { increment: 1 }, updatedAt: this.clock.now() } });
  }

  async preview(_ctx: ActionContext, input: CreateIn, tx: TenantTx) {
    const p = await liveProduct(tx, input.product_id);
    await assertSkuFree(tx, input.sku.trim(), null);
    return preview('write', line(p.code, p.name, input.name), { changes: [created('product_variant', { product: p.code, name: input.name.trim(), sku: input.sku.trim(), price: input.price ?? null })] });
  }
}

@Injectable()
@ActionHandler('product_variant.update')
export class VariantUpdateHandler implements Handler<UpdateIn, { variant_id: string; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: UpdateIn, tx: TenantTx): Promise<HandlerOutcome<{ variant_id: string; version: number }>> {
    const v = await lockVariant(tx, input.variant_id);
    if (input.if_version !== undefined && input.if_version !== v.version) throw new AppError('STALE_VERSION', 409, { version: String(v.version) });
    if (v.status === 'archived') throw new AppError('INVALID_STATE', 409, { status: v.status });
    const p = input.patch;
    const sku = p.sku?.trim();
    if (sku && sku.toLowerCase() !== v.sku.toLowerCase()) await assertSkuFree(tx, sku, v.id);
    const r = await tx.productVariant.update({
      where: { id: v.id },
      data: {
        ...(sku ? { sku } : {}),
        ...(p.name !== undefined ? { name: p.name.trim() } : {}),
        ...(p.attrs !== undefined ? { attrs: p.attrs as object } : {}),
        ...(p.price !== undefined ? { price: priceOf(p.price) } : {}),
        version: { increment: 1 },
        updatedAt: this.clock.now(),
      },
      select: { version: true },
    });
    return { result: { variant_id: v.id, version: r.version }, before: variantSnap(v), events: [changed(v.productId)] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await restoreVariant(tx, log.before as VariantSnap, this.clock.now());
  }

  async preview(_ctx: ActionContext, input: UpdateIn, tx: TenantTx) {
    const v = await lockVariant(tx, input.variant_id);
    const cur = { sku: v.sku, name: v.name, price: v.price === null ? null : String(v.price) };
    const patch = { sku: input.patch.sku?.trim(), name: input.patch.name?.trim(), price: input.patch.price };
    return preview('write', line(v.sku, v.name), { changes: updated('product_variant', v.id, cur, patch) });
  }
}

@Injectable()
@ActionHandler('product_variant.archive')
export class VariantArchiveHandler implements Handler<ArchiveIn, { variant_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ArchiveIn, tx: TenantTx): Promise<HandlerOutcome<{ variant_id: string }>> {
    const v = await lockVariant(tx, input.variant_id);
    if (v.status === 'archived') return { result: { variant_id: v.id } };
    await tx.productVariant.update({ where: { id: v.id }, data: { status: 'archived', version: { increment: 1 }, updatedAt: this.clock.now() } });
    return { result: { variant_id: v.id }, before: variantSnap(v), events: [changed(v.productId)] };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    if (log.before) await restoreVariant(tx, log.before as VariantSnap, this.clock.now());
  }

  async preview(_ctx: ActionContext, input: ArchiveIn, tx: TenantTx) {
    const v = await lockVariant(tx, input.variant_id);
    const used = await tx.orderItem.count({ where: { variantId: v.id } });
    return preview('write', line(v.sku, v.name), { changes: updated('product_variant', v.id, { status: v.status }, { status: 'archived' }), ...(used ? { warnings: [`history:${used}`] } : {}) });
  }
}
