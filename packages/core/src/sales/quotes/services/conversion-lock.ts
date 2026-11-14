// Một báo giá → tối đa MỘT hợp đồng HOẶC MỘT đơn (COMMERCE §3; TIP-032b P1, Q-025). Cả `contract.create_from_quote` và
// `order.create_from_quote` gọi cùng helper: khoá dòng báo giá (FOR UPDATE) rồi đọc hợp đồng / đơn đã sinh trong CÙNG transaction — hai yêu
// cầu đồng thời xếp hàng trên khoá, người sau thấy chứng từ của người trước (không write skew). Gọi lại cùng loại → trả chứng từ cũ (replay);
// khác loại → QUOTE_ALREADY_CONVERTED kèm mã chứng từ đã sinh. Quyền xem báo giá kiểm TRƯỚC khi lộ mã (rbac §9 — không thấy → 404).
// Đơn từ HĐ đã ký (`order.create_from_contract`) không đi qua đây — COMMERCE §4 cho phép.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { lockQuote, type QuoteRecord } from '../quote-access';
import { lockRootOf } from '../../../kernel/ownership/root-lock';

export type ConversionKind = 'contract' | 'order';

export interface Conversion {
  quote: QuoteRecord;
  /** Chứng từ cùng loại đã sinh từ báo giá này (gọi lại → trả nguyên). */
  existing: { id: string; code: string } | null;
}

/** Hợp đồng (chưa xoá) / đơn đã sinh từ báo giá — đọc sau khi đã khoá dòng báo giá. */
async function convertedTo(tx: TenantTx, quoteId: string) {
  const [contract, order] = await Promise.all([
    tx.contract.findFirst({ where: { quoteId, deletedAt: null }, select: { id: true, code: true } }),
    tx.order.findFirst({ where: { quoteId, deletedAt: null }, select: { id: true, code: true } }),
  ]);
  return { contract, order };
}

/** Khoá báo giá + kiểm chặn chéo. Gọi trong transaction của action, trước khi tạo chứng từ. */
export async function lockConversion(tx: TenantTx, authz: AuthzContext, quoteId: string, kind: ConversionKind): Promise<Conversion> {
  // TIP-015f §2.5: khách → báo giá (chứng từ tạo sau đó khoá lại cùng khách — không đảo thứ tự).
  await lockRootOf(tx, 'quote', quoteId);
  const quote = await lockQuote(tx, authz, quoteId);
  const done = await convertedTo(tx, quote.id);
  const other = kind === 'contract' ? done.order : done.contract;
  if (other) throw new AppError('QUOTE_ALREADY_CONVERTED', 409, { quote_id: kind === 'contract' ? 'has_order' : 'has_contract', code: other.code });
  return { quote, existing: done[kind] };
}
