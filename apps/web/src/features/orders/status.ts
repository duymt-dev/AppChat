// Màu chip 2 trục của đơn — prototype ST L9500 (paid / deposit / pending / cancelled) mở rộng theo COMMERCE §4.
import { color } from '@appchat/ui';
import type { OrderChip, OrderStatus, PayStatus } from './types';

export const STATUS_TONE: Record<OrderStatus, [fg: string, bg: string]> = {
  new: [color.blue, color.assigneeBg],
  processing: [color.amberText, color.warnSoftBg],
  completed: [color.brandInk, color.doneBg],
  cancelled: [color.dangerDeep, color.roseBg],
};

export const PAY_TONE: Record<PayStatus, string> = {
  unpaid: color.text3,
  awaiting_deposit: color.amberText,
  deposited: color.blue,
  partial: color.blue,
  paid: color.brandInk,
  partially_refunded: color.dangerDeep,
  refunded: color.dangerDeep,
};

/** Cột kanban (prototype odKanbanCols L9497): Đã thanh toán · Đã cọc · Chờ cọc · Đã huỷ — nhóm theo chip. */
export const KANBAN: [key: Exclude<OrderChip, 'all'>, tone: string][] = [
  ['paid', color.brandInk],
  ['deposit', color.blue],
  ['pending', color.amberText],
  ['cancelled', color.dangerDeep],
];

/** Chip lọc (prototype odFilters L9487). */
export const FILTERS: OrderChip[] = ['all', 'paid', 'deposit', 'pending', 'cancelled'];

/** Cột kanban của một đơn; đơn chưa thuộc 4 nhóm (mới chưa thu, một phần) không vào kanban. */
export const laneOf = (s: OrderStatus, p: PayStatus): string =>
  s === 'cancelled'
    ? 'cancelled'
    : p === 'paid'
      ? 'paid'
      : p === 'deposited'
        ? 'deposit'
        : p === 'awaiting_deposit'
          ? 'pending'
          : 'other';

export const avInitial = (name: string) =>
  (name.replace(/^(Chị|Anh|Cty|Khách) /, '')[0] ?? '?').toUpperCase();
export const avColor = (name: string) => `hsl(${(name.length * 47) % 360} 50% 46%)`;
