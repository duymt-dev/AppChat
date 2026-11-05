// Preview danh mục / tồn kho (TIP-023b R2.8): tạo danh mục → tên (đã có cùng tên không phân biệt hoa thường → cảnh báo dùng lại); điều chỉnh
// tồn → sản phẩm + tồn trước / sau + lý do, xuống dưới ngưỡng / âm → cảnh báo (không chặn — COMMERCE §2); không phải hàng vật lý / delta 0
// → 422 như execute. Chỉ đọc — không ghi sổ kho.
import type { ActionInput, ActionPreview, categoryCreate, stockAdjust } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, updated } from '../../../kernel/actions/preview-kit';
import { liveProduct, lowOf } from '../../services/catalog-write';

export async function categoryPreview(tx: TenantTx, i: ActionInput<typeof categoryCreate>): Promise<ActionPreview> {
  const n = i.name.trim();
  const hit = await tx.$queryRaw<{ id: string; name: string }[]>`SELECT id, name FROM product_category WHERE lower(name) = lower(${n}) LIMIT 1`;
  return preview('config', hit[0]?.name ?? n, { changes: hit[0] ? [] : [created('product_category', { name: n })], ...(hit[0] ? { warnings: [`existing:${hit[0].name}`] } : {}) });
}

export async function adjustPreview(tx: TenantTx, i: ActionInput<typeof stockAdjust>): Promise<ActionPreview> {
  const p = await liveProduct(tx, i.product_id);
  if (p.type !== 'physical') throw new AppError('VALIDATION_FAILED', 422, { product_id: 'not_physical' });
  if (!i.delta) throw new AppError('VALIDATION_FAILED', 422, { delta: 'zero' });
  const cur = p.stock ?? 0;
  const next = cur + i.delta;
  const warnings = [...(next < 0 ? ['negative_stock'] : []), ...(lowOf(next, p.lowStockThreshold) ? ['low_stock'] : [])];
  return preview('write', line(p.code, p.name), {
    changes: updated('product', p.id, { stock: cur, reason: null }, { stock: next, reason: i.reason.trim() }),
    ...(warnings.length ? { warnings } : {}),
  });
}
