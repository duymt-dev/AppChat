// Kiểu dữ liệu Sản phẩm (Blueprint §2.2 catalog; COMMERCE §2). Tiền là string VND, giá chưa VAT.
export type ProductType = 'physical' | 'service' | 'combo' | 'package' | 'digital' | 'rental';

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  type: ProductType;
  price: string;
  cost: string;
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
  tint: string;
  ink: string;
  icon: string;
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
  custom_fields: { key: string; label: string; type: string }[];
}

export interface ProductFilter {
  category: string;
  q: string;
}
