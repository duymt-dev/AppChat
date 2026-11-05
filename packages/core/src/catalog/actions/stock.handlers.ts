// category.create · stock.adjust (Blueprint §3.4 catalog; COMMERCE §2 tồn kho). Điều chỉnh tồn = một dòng sổ kho `adjust`
// (khoá dòng sản phẩm — concurrency §3), cho tồn âm và trả cờ `low_stock` để UI / agent cảnh báo. Undo = dòng bù ngược dấu
// (sổ chỉ thêm, không xoá dòng cũ). Không phát `product.changed`: tồn không vào RAG (rag §2) — nạp lại chỉ tốn credit embed.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, categoryCreate, stockAdjust } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { actorUserId } from '../../crm/public';
import { categoryByName, liveProduct, recordMovement } from '../services/catalog-write';
import { adjustPreview, categoryPreview } from './previews/stock.handlers.preview';

@Injectable()
@ActionHandler('category.create')
export class CategoryCreateHandler implements Handler<ActionInput<typeof categoryCreate>, { name: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof categoryCreate>, tx: TenantTx): Promise<HandlerOutcome<{ name: string }>> {
    const name = input.name.trim();
    const id = await categoryByName(tx, name, this.clock.now());
    const row = await tx.productCategory.findUniqueOrThrow({ where: { id: id! }, select: { name: true } });
    return { result: { name: row.name }, after: { id } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof categoryCreate>, tx: TenantTx) {
    return categoryPreview(tx, input);
  }
}

@Injectable()
@ActionHandler('stock.adjust')
export class StockAdjustHandler implements Handler<ActionInput<typeof stockAdjust>, { product_id: string; stock: number; low_stock: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof stockAdjust>, tx: TenantTx): Promise<HandlerOutcome<{ product_id: string; stock: number; low_stock: boolean }>> {
    const p = await liveProduct(tx, input.product_id);
    if (p.type !== 'physical') throw new AppError('VALIDATION_FAILED', 422, { product_id: 'not_physical' });
    if (!input.delta) throw new AppError('VALIDATION_FAILED', 422, { delta: 'zero' });
    const now = this.clock.now();
    const refId = uuidv7(now.getTime());
    const r = await recordMovement(tx, { productId: p.id, kind: 'adjust', qty: input.delta, refType: 'adjust', refId, reason: input.reason.trim(), actorId: actorUserId(ctx) }, now);
    return {
      result: { product_id: p.id, stock: r.stock, low_stock: r.low },
      before: { id: p.id, delta: input.delta, ref_id: refId },
      after: { id: p.id, stock: r.stock },
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; delta: number; ref_id: string };
    await recordMovement(tx, { productId: b.id, kind: 'adjust', qty: -b.delta, refType: 'adjust_undo', refId: b.ref_id, reason: 'undo', actorId: actorUserId(ctx) }, this.clock.now());
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof stockAdjust>, tx: TenantTx) {
    return adjustPreview(tx, input);
  }
}
