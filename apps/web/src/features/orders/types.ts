// Kiểu dữ liệu Đơn hàng — khớp response mock / API Blueprint §4.4 orders (COMMERCE-DECISIONS §4, §4b).
import type { CustomValues, Discount } from '@appchat/shared';

export type OrderStatus = 'new' | 'processing' | 'completed' | 'cancelled';
export type PayStatus = 'unpaid' | 'awaiting_deposit' | 'deposited' | 'partial' | 'paid' | 'refunded';
export type OrderSource = 'manual' | 'quote' | 'contract' | 'appointment' | 'marketplace' | 'pos';
/** Chip lọc của prototype — mỗi chip lọc đúng trục của nó (COMMERCE §4). */
export type OrderChip = 'all' | 'paid' | 'deposit' | 'pending' | 'cancelled';

export interface OrderItem {
  product_id?: string;
  name: string;
  variant?: string;
  qty: number;
  unit_price: string;
  tax_rate: number;
  discount?: Discount | null;
}

export interface OrderEvent {
  type: string;
  at: string;
  actor: string;
  amount?: string;
  points?: number;
  reason?: string;
}

export interface Shipping {
  carrier: string;
  tracking: string;
  eta: string;
  address: string;
  receiver: string;
  receiver_phone: string;
}

export interface Order {
  id: string;
  code: string;
  source: OrderSource;
  channel: string;
  external: { platform: string; external_id: string; platform_status: string } | null;
  locked_lines: boolean;
  contact_id: string;
  contact_name: string;
  phone: string;
  owner_user_id: string;
  owner_name: string;
  quote_id: string | null;
  quote_code: string;
  contract_id: string | null;
  contract_code: string;
  status: OrderStatus;
  pay_status: PayStatus;
  deposit_required: boolean;
  deposit_amount: string;
  paid_total: string;
  refund_pending: boolean;
  items: OrderItem[];
  header_discount: Discount | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  created_at: string;
  cancel_reason: string;
  points_earned: number;
  shipping: Shipping;
  note: string;
  events: OrderEvent[];
  ai: { hint: string; wait: boolean };
  /** Trường tuỳ biến (D56). */
  custom?: CustomValues;
}

export interface OrderFilter {
  chip: OrderChip;
  owner_id: string;
  value: string;
  source: string;
  q: string;
  custom?: Record<string, string>;
}

export interface OrdersMeta {
  counts: Record<string, number>;
  stats: { total: number; paid: number; pending: number; revenue: string };
  crm: { ltv: string; total: number; tier: string; points: number };
  insight: string;
  files: { name: string; ext: string; by: string; at: string; size: string }[];
  ai_runs: Record<string, string>;
}
