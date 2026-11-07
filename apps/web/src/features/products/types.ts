// Kiểu dữ liệu Sản phẩm (Blueprint §2.2 catalog; COMMERCE §2). Tiền là string VND, giá chưa VAT.
import type { CustomValues } from '@appchat/shared';

export type ProductType = 'physical' | 'service' | 'combo' | 'package' | 'digital' | 'rental';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  type: ProductType;
  price: string;
  /** Giá vốn; vắng khi người xem không có quyền (`hidden_fields` chứa 'cost'). */
  cost?: string | null;
  unit: string;
  tax_rate: number;
  sold: number;
  status: 'active' | 'draft';
  channels: string[];
  description: string;
  attrs: string[];
  stock: number | null;
  sessions: number | null;
  valid_days: number | null;
  /** TIP-032b — liệu trình sinh khi mới cọc. */
  grant_on_deposit?: boolean;
  tint: string;
  ink: string;
  icon: string;
  /** Trường tuỳ biến (D56). */
  custom?: CustomValues;
  /** Trường hệ thống bị ẩn theo quyền (TIP-045b annex C). */
  hidden_fields?: string[];
  /** TIP-027 — khoá lạc quan (`if_version`) + chi tiết cho form sửa (GET /products/:id). */
  version?: number;
  duration_min?: number | null;
  deposit?: string | null;
  rental_unit?: string | null;
  low_stock?: boolean;
  components?: { id: string; name: string; qty: number }[];
  attr_defs?: { name: string; values: string[] }[];
  variants?: { id: string; sku: string; name: string; stock: number }[];
}

/** Một mục tab Lịch sử (`GET /products/:id/activity`). */
export interface ProductActivity {
  id: string;
  kind: 'create' | 'update' | 'price' | 'archive' | 'restore' | 'stock';
  text: string;
  by: string;
  at: string;
  when: string;
}

export interface ProductsMeta {
  categories: string[];
  category_color: Record<string, string>;
  category_pal: Record<string, [string, string, string]>;
  sync_sources: { key: string; color: string; status: 'synced' | 'soon'; at?: string }[];
  stats: { total: number; active: number; channels: number; sold_month: number };
  files: [string, string, string][];
  history: [string, string, string][];
  crm_stats: [string, string, string][];
  crm_buyers: [string, string, string][];
}

export interface ProductFilter {
  category: string;
  q: string;
}
