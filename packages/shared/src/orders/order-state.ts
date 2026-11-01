// Đơn hàng — hai trục độc lập (COMMERCE §4, state-machine §4): tiến độ `status` theo ORDER_FLOW (dùng chung handler, mock FE, nút UI,
// Trợ lý); thanh toán `pay_status` là trạng thái TỔNG HỢP từ số đã thu / đã hoàn (không action nào đặt trực tiếp — `payStatusOf`).
// "Xác nhận đơn" = new → processing (trừ kho). Đơn sàn (D31) khoá dòng hàng / giá / tổng; trạng thái đi theo ánh xạ của adapter.
import { defineFlow } from '../state/flow';

export const ORDER_STATUSES = ['new', 'processing', 'completed', 'cancelled'] as const;
export type OrderStatusKey = (typeof ORDER_STATUSES)[number];
export const PAY_STATUSES = ['unpaid', 'awaiting_deposit', 'deposited', 'partial', 'paid', 'partially_refunded', 'refunded'] as const;
export type PayStatusKey = (typeof PAY_STATUSES)[number];
export const ORDER_SOURCES = ['manual', 'quote', 'contract', 'appointment', 'marketplace', 'pos'] as const;
export type OrderSourceKey = (typeof ORDER_SOURCES)[number];

export const ORDER_FLOW = defineFlow<OrderStatusKey>({
  new: {
    'order.update': 'new',
    'order.set_deposit': 'new',
    'order.update_shipping': 'new',
    'order.confirm': 'processing',
    'order.cancel': 'cancelled',
  },
  processing: {
    'order.update': 'processing',
    'order.set_deposit': 'processing',
    'order.update_shipping': 'processing',
    'order.complete': 'completed',
    'order.cancel': 'cancelled',
  },
  completed: {},
  cancelled: {},
  terminal: ['completed', 'cancelled'],
});

/** Vận chuyển vẫn nhập được sau khi hoàn tất (mã vận đơn về muộn) — ngoài bảng vì `completed` là trạng thái cuối. */
export const SHIPPING_EDITABLE: readonly OrderStatusKey[] = ['new', 'processing', 'completed'];

export interface PayInput {
  status: OrderStatusKey;
  total: bigint | number | string;
  paid: bigint | number | string;
  refunded: bigint | number | string;
  depositRequired: boolean;
  depositAmount: bigint | number | string | null;
}

/** pay_status tổng hợp (COMMERCE §4): "Chờ cọc" chỉ khi `deposit_required`; hoàn tiền một phần / toàn bộ theo số đã hoàn. */
export function payStatusOf(o: PayInput): PayStatusKey {
  const total = BigInt(o.total);
  const paid = BigInt(o.paid);
  const refunded = BigInt(o.refunded);
  if (refunded > 0n) return refunded >= paid ? 'refunded' : 'partially_refunded';
  if (paid > 0n && paid >= total) return 'paid';
  if (o.depositRequired && paid > 0n && paid >= BigInt(o.depositAmount ?? 0)) return 'deposited';
  if (paid > 0n) return 'partial';
  return o.depositRequired ? 'awaiting_deposit' : 'unpaid';
}

/** Chip lọc của prototype — mỗi chip lọc đúng trục của nó (đơn huỷ chỉ ở "Đã huỷ"). */
export const ORDER_CHIPS = ['all', 'paid', 'deposit', 'pending', 'cancelled'] as const;
export const ORDER_CHIP_PAY: Record<string, PayStatusKey> = { paid: 'paid', deposit: 'deposited', pending: 'awaiting_deposit' };

/** Điểm khi hoàn tất (COMMERCE §7): floor(net trước VAT / 10.000) × hệ số hạng; đơn sàn mặc định 0 (§4b). */
export const POINT_UNIT = 10_000n;
export const TIER_MULTIPLIER: Record<string, number> = { member: 1, silver: 1, gold: 1.5, diamond: 2 };
export function pointsFor(netBeforeVat: bigint | string, tierKey: string | null | undefined): number {
  const base = Number(BigInt(netBeforeVat) / POINT_UNIT);
  return Math.floor(base * (TIER_MULTIPLIER[tierKey ?? ''] ?? 1));
}
