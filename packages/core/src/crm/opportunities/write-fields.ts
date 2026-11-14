// Ô ghi của cơ hội (TIP-026c §1–2): input → cột, ảnh trước để hoàn tác (chỉ cột thật + sản phẩm), thay danh sách sản phẩm (≤ 20, vị trí
// 0…19), chiến dịch tồn tại, chặn ghi tiền thiếu quote.create (045b). Không có cột xác suất.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { canWriteAmount } from '../activities/authority';
import { UUID } from '../services/access';
import type { OpportunityRecord } from './locks';

export interface FieldsIn {
  title?: string;
  need?: string;
  amount_vnd?: string | null;
  expected_close_date?: string | null;
  source_kind?: string;
}
export interface ItemIn {
  product_id?: string | null;
  name: string;
  qty: number;
}
export type ItemRow = { productId: string | null; name: string; qty: number };

/** Ghi tiền (kể cả xoá về null) cần crm.edit ∩ quote.create → 403 khi thiếu. */
export function moneyGuard(authz: AuthzContext, p: { amount_vnd?: unknown }) {
  if (p.amount_vnd !== undefined && !canWriteAmount(authz)) throw new AppError('FORBIDDEN', 403, { amount_vnd: 'forbidden' });
}

export function fieldsOf(p: FieldsIn) {
  const d: Record<string, unknown> = {};
  if (p.title !== undefined) d.title = p.title.trim();
  if (p.need !== undefined) d.need = p.need;
  if (p.amount_vnd !== undefined) d.amountVnd = p.amount_vnd === null ? null : BigInt(p.amount_vnd);
  if (p.expected_close_date !== undefined) d.expectedCloseDate = p.expected_close_date ? new Date(`${p.expected_close_date}T00:00:00Z`) : null;
  if (p.source_kind !== undefined) d.sourceKind = p.source_kind;
  return d;
}

export const itemsOf = (items: ItemIn[] | undefined): ItemRow[] => (items ?? []).map((i) => ({ productId: i.product_id ?? null, name: i.name.trim(), qty: i.qty }));

/** Chiến dịch phải tồn tại (chưa xoá) — sai → 422 chung. */
export async function campaignOf(tx: TenantTx, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const c = UUID.test(id) ? await tx.campaign.findUnique({ where: { id }, select: { deletedAt: true } }) : null;
  if (!c || c.deletedAt) throw new AppError('VALIDATION_FAILED', 422, { campaign_id: 'invalid' });
  return id;
}

/** Thay toàn bộ sản phẩm của cơ hội (giữ thứ tự gửi lên làm vị trí). Sản phẩm danh mục phải tồn tại. */
export async function replaceItems(tx: TenantTx, opportunityId: string, items: ItemRow[]) {
  const pids = [...new Set(items.map((i) => i.productId).filter((x): x is string => !!x))];
  if (pids.some((p) => !UUID.test(p))) throw new AppError('VALIDATION_FAILED', 422, { items: 'invalid_product' });
  if (pids.length) {
    const found = await tx.product.count({ where: { id: { in: pids }, deletedAt: null } });
    if (found !== pids.length) throw new AppError('VALIDATION_FAILED', 422, { items: 'invalid_product' });
  }
  await tx.contactOpportunityItem.deleteMany({ where: { opportunityId } });
  if (!items.length) return;
  const at = Date.now();
  await tx.contactOpportunityItem.createMany({ data: items.map((i, position) => ({ id: uuidv7(at), opportunityId, productId: i.productId, name: i.name, qty: i.qty, position })) });
}

/** Ảnh trước (để hoàn tác) — chỉ cột thật, không suy diễn. */
export const snapshot = (o: Pick<OpportunityRecord, 'title' | 'need' | 'amountVnd' | 'expectedCloseDate' | 'sourceKind' | 'campaignId'>, items: ItemRow[]) => ({
  title: o.title,
  need: o.need,
  amountVnd: o.amountVnd === null ? null : String(o.amountVnd),
  expectedCloseDate: o.expectedCloseDate?.toISOString() ?? null,
  sourceKind: o.sourceKind,
  campaignId: o.campaignId,
  items: items.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty })),
});
export type Snap = ReturnType<typeof snapshot>;
export const fromSnap = (s: Snap) => ({
  title: s.title,
  need: s.need,
  amountVnd: s.amountVnd === null ? null : BigInt(s.amountVnd),
  expectedCloseDate: s.expectedCloseDate ? new Date(s.expectedCloseDate) : null,
  sourceKind: s.sourceKind,
  campaignId: s.campaignId,
});
