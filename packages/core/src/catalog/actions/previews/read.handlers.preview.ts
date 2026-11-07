// Preview product.search / product.get / stock.get (TIP-023b R2.8): tóm tắt điều kiện tra / sản phẩm sẽ đọc. Chỉ đọc; sản phẩm lạ → 404 như
// execute. Giá / tồn không đưa vào preview (đọc ở execute — luôn từ DB).
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, productGet, productSearch, stockGet } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { line, preview } from '../../../kernel/actions/preview-kit';
import { UUID } from '../../services/catalog-write';

export const searchPreview = (i: ActionInput<typeof productSearch>): ActionPreview => preview('read', line(i.query, i.type), { count: i.limit ?? 10 });

export async function getPreview(tx: TenantTx, i: ActionInput<typeof productGet>): Promise<ActionPreview> {
  const where = i.product_id ? (UUID.test(i.product_id) ? { id: i.product_id } : null) : { code: i.code! };
  const p = where ? await tx.product.findFirst({ where: { ...where, deletedAt: null }, select: { code: true, name: true } }) : null;
  if (!p) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
  return preview('read', line(p.code, p.name));
}

export async function stockPreview(tx: TenantTx, i: ActionInput<typeof stockGet>): Promise<ActionPreview> {
  const ids = i.product_ids.filter((x) => UUID.test(x));
  const rows = await tx.product.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { name: true } });
  return preview('read', line(...rows.slice(0, 3).map((r) => r.name)), { count: rows.length });
}
