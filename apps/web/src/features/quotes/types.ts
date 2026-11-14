// Kiểu dữ liệu Báo giá (Blueprint §2.2 quote / quote_item; COMMERCE §3). Tiền là string VND, đơn giá chưa VAT.
import type { CustomValues, Discount } from '@appchat/shared';

export type QuoteStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'revision_requested'
  | 'rejected'
  | 'expired'
  | 'superseded';

export interface QuoteItem {
  product_id?: string;
  name: string;
  variant?: string;
  qty: number;
  unit_price: string;
  tax_rate: number;
  discount?: Discount | null;
}

export interface Quote {
  id: string;
  code: string;
  version: number;
  root_id: string;
  contact_id: string;
  contact_name: string;
  phone: string;
  returning: boolean;
  owner_user_id: string;
  owner_name: string;
  /** Người phụ trách vận hành hiện tại (TIP-015d) — '' = chưa giao. */
  assigned_user_id: string;
  assigned_name: string;
  status: QuoteStatus;
  items: QuoteItem[];
  header_discount: Discount | null;
  valid_days: number;
  created_at: string;
  sent_at: string | null;
  valid_until: string;
  note: string;
  gift: string;
  payment_terms: string;
  comments: { who: string; text: string; at: string }[];
  ai: { hint: string; wait: boolean };
  off_catalog: boolean;
  subtotal: string;
  discount_total: string;
  header_discount_total: string;
  tax_total: string;
  total: string;
  lines: { gross: string; net: string }[];
  approval_reasons: ('total' | 'discount' | 'off_catalog')[];
  /** Đã sinh chứng từ (TIP-032b — một báo giá → một HĐ hoặc một đơn). */
  converted?: 'contract' | 'order' | null;
  /** PDF đóng băng (TIP-028b, job doc-render): đang tạo / xong / lỗi (có Thử lại). null = chưa phát hành. */
  render?: { status: 'pending_render' | 'rendered' | 'render_failed'; error: string | null } | null;
  /** Trường tuỳ biến (D56). */
  custom?: CustomValues;
}

export interface QuotesMeta {
  counts: Record<string, number>;
  stats: { total: number; approved: number; waiting: number; close_rate: string };
  crm_stats: [string, string, string][];
  timeline: [string, string, string, string][];
  todos: [string, boolean, string][];
  history: [string, string][];
  ai_runs: Record<string, string>;
}

export interface QuoteFilter {
  status: string;
  /** Người báo giá (người tạo — doanh số). */
  owner_id: string;
  /** Người phụ trách vận hành hiện tại (TIP-015d) — bộ lọc riêng, không suy từ owner_id. */
  assigned_user_id?: string;
  returning: string;
  q: string;
  custom?: Record<string, string>;
}
