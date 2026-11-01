// product.search · product.get · stock.get (Blueprint §3.4 catalog — read, agent dùng tư vấn): giá + tồn luôn đọc từ DB,
// không bao giờ từ RAG (rag §2). Sản phẩm lưu trữ không trả; `search` chỉ trả sản phẩm đang bán.
import { Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionOutput, productGet, productSearch, stockGet } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { searchProductIds } from '../repos/products.repo';
import { UUID, lowOf } from '../services/catalog-write';
import { attrsOf, categoryMap, PRODUCT_SELECT, type ProductRecord } from '../services/product-view';

type SearchOut = ActionOutput<typeof productSearch>;
type GetOut = ActionOutput<typeof productGet>;
type StockOut = ActionOutput<typeof stockGet>;

const hit = (p: ProductRecord, cats: Map<string, { name: string }>) => ({
  product_id: p.id,
  code: p.code,
  name: p.name,
  type: p.type,
  category: (p.categoryId && cats.get(p.categoryId)?.name) || '',
  price: String(p.price),
  unit: p.unit,
  tax_rate: p.taxRate,
  stock: p.stock,
  status: p.status,
});

@Injectable()
@ActionHandler('product.search')
export class ProductSearchHandler implements Handler<ActionInput<typeof productSearch>, SearchOut> {
  async execute(_ctx: ActionContext, input: ActionInput<typeof productSearch>, tx: TenantTx): Promise<HandlerOutcome<SearchOut>> {
    const ids = await searchProductIds(tx, input.query ?? '', input.type, input.limit ?? 10);
    const [rows, cats] = await Promise.all([tx.product.findMany({ where: { id: { in: ids } }, select: PRODUCT_SELECT }), categoryMap(tx)]);
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    return { result: { items: rows.map((r) => hit(r as ProductRecord, cats.map)) } };
  }
}

@Injectable()
@ActionHandler('product.get')
export class ProductGetHandler implements Handler<ActionInput<typeof productGet>, GetOut> {
  async execute(_ctx: ActionContext, input: ActionInput<typeof productGet>, tx: TenantTx): Promise<HandlerOutcome<GetOut>> {
    const where = input.product_id ? (UUID.test(input.product_id) ? { id: input.product_id } : null) : { code: input.code! };
    const p = where ? await tx.product.findFirst({ where: { ...where, deletedAt: null }, select: PRODUCT_SELECT }) : null;
    if (!p) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
    const [cats, parts] = await Promise.all([
      categoryMap(tx),
      tx.productComponent.findMany({ where: { productId: p.id }, select: { childId: true, qty: true, child: { select: { name: true } } } }),
    ]);
    const r = p as ProductRecord;
    return {
      result: {
        ...hit(r, cats.map),
        description: r.description,
        attrs: attrsOf(r.attrs),
        components: parts.map((c) => ({ product_id: c.childId, name: c.child.name, qty: c.qty })),
        duration_min: r.durationMin,
        sessions: r.sessions,
        valid_days: r.validDays,
      },
    };
  }
}

@Injectable()
@ActionHandler('stock.get')
export class StockGetHandler implements Handler<ActionInput<typeof stockGet>, StockOut> {
  async execute(_ctx: ActionContext, input: ActionInput<typeof stockGet>, tx: TenantTx): Promise<HandlerOutcome<StockOut>> {
    const ids = input.product_ids.filter((x) => UUID.test(x));
    const rows = await tx.product.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true, name: true, stock: true, lowStockThreshold: true } });
    const by = new Map(rows.map((r) => [r.id, r]));
    const items = input.product_ids.flatMap((id) => {
      const r = by.get(id);
      return r ? [{ product_id: r.id, name: r.name, stock: r.stock, low: lowOf(r.stock, r.lowStockThreshold) }] : [];
    });
    return { result: { items } };
  }
}
