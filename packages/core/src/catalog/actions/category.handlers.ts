// category.list · update · delete (TIP-032b, Blueprint §3.4 — risk config, không hoàn tác như category.create). Đổi tên trùng (không phân biệt
// hoa thường) danh mục khác → 409; xoá kiểm quan hệ trong transaction đã khoá dòng danh mục: còn sản phẩm bất kỳ trạng thái (kể cả đã lưu
// trữ — giữ lịch sử phân loại) → 409 có số lượng, không xoá dây chuyền.
import { Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionOutput, ActionPreview, categoryDelete, categoryList, categoryUpdate } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview, removed, updated } from '../../kernel/actions/preview-kit';
import { UUID } from '../services/catalog-write';

type UpdateIn = ActionInput<typeof categoryUpdate>;
type DeleteIn = ActionInput<typeof categoryDelete>;

async function lockCategory(tx: TenantTx, id: string) {
  const rows = UUID.test(id) ? await tx.$queryRaw<{ id: string; name: string; color: string }[]>`SELECT id, name, color FROM product_category WHERE id = ${id}::uuid FOR UPDATE` : [];
  if (!rows[0]) throw new AppError('NOT_FOUND', 404, { category_id: 'not_found' });
  return rows[0];
}

async function assertNameFree(tx: TenantTx, name: string, selfId: string) {
  const hit = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM product_category WHERE lower(name) = lower(${name}) AND id <> ${selfId}::uuid LIMIT 1`;
  if (hit[0]) throw new AppError('CONFLICT', 409, { name: 'duplicate' });
}

const productsIn = (tx: TenantTx, id: string) => tx.product.count({ where: { categoryId: id } });

@Injectable()
@ActionHandler('category.update')
export class CategoryUpdateHandler implements Handler<UpdateIn, { category_id: string; name: string; color: string }> {
  async execute(_ctx: ActionContext, input: UpdateIn, tx: TenantTx): Promise<HandlerOutcome<{ category_id: string; name: string; color: string }>> {
    const c = await lockCategory(tx, input.category_id);
    const name = input.name?.trim() ?? c.name;
    if (name.toLowerCase() !== c.name.toLowerCase()) await assertNameFree(tx, name, c.id);
    const color = input.color ?? c.color;
    await tx.productCategory.update({ where: { id: c.id }, data: { name, color } });
    return { result: { category_id: c.id, name, color }, before: c, after: { id: c.id, name, color } };
  }

  async preview(_ctx: ActionContext, input: UpdateIn, tx: TenantTx) {
    const c = await lockCategory(tx, input.category_id);
    if (input.name && input.name.trim().toLowerCase() !== c.name.toLowerCase()) await assertNameFree(tx, input.name.trim(), c.id);
    return preview('config', c.name, { changes: updated('product_category', c.id, { name: c.name, color: c.color }, { name: input.name?.trim(), color: input.color }) });
  }
}

@Injectable()
@ActionHandler('category.delete')
export class CategoryDeleteHandler implements Handler<DeleteIn, { category_id: string }> {
  async execute(_ctx: ActionContext, input: DeleteIn, tx: TenantTx): Promise<HandlerOutcome<{ category_id: string }>> {
    const c = await lockCategory(tx, input.category_id);
    const n = await productsIn(tx, c.id);
    if (n) throw new AppError('CONFLICT', 409, { category_id: 'has_products', count: String(n) });
    await tx.productCategory.delete({ where: { id: c.id } });
    return { result: { category_id: c.id }, before: c };
  }

  async preview(_ctx: ActionContext, input: DeleteIn, tx: TenantTx) {
    const c = await lockCategory(tx, input.category_id);
    const n = await productsIn(tx, c.id);
    if (n) throw new AppError('CONFLICT', 409, { category_id: 'has_products', count: String(n) });
    return preview('config', line(c.name), { changes: [removed('product_category', c.id, { name: c.name })] });
  }
}

/** Danh mục + số sản phẩm (đường tra `category_id` cho Trợ lý). */
@Injectable()
@ActionHandler('category.list')
export class CategoryListHandler implements Handler<ActionInput<typeof categoryList>, ActionOutput<typeof categoryList>> {
  async execute(_ctx: ActionContext, _input: ActionInput<typeof categoryList>, tx: TenantTx): Promise<HandlerOutcome<ActionOutput<typeof categoryList>>> {
    const rows = await tx.productCategory.findMany({ orderBy: [{ sort: 'asc' }, { name: 'asc' }], select: { id: true, name: true, color: true, _count: { select: { products: true } } } });
    return { result: { items: rows.map((c) => ({ category_id: c.id, name: c.name, color: c.color, product_count: c._count.products })) } };
  }

  async preview(_ctx: ActionContext, _input: ActionInput<typeof categoryList>, tx: TenantTx): Promise<ActionPreview> {
    return preview('read', 'category', { count: await tx.productCategory.count() });
  }
}
