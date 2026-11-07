// Bảng màu danh mục / nguồn bán của Sản phẩm (prototype L5624–5753) — một nguồn cho seed DB, API thật và mock FE.
// Danh mục lưu `color` (hex); nền / icon thẻ suy theo màu từ bảng dưới, màu lạ → nền nhạt mặc định.

/** 5 danh mục mặc định của workspace mới (seed `catalog.defaults`) — đúng thứ tự prototype. */
export const DEFAULT_CATEGORIES = [
  { name: 'Liệu trình', color: '#1F9C4F' },
  { name: 'Combo', color: '#2B9EF3' },
  { name: 'Gói năm', color: '#8B5CF6' },
  { name: 'Dịch vụ lẻ', color: '#C9820B' },
  { name: 'Sản phẩm', color: '#0E9B94' },
] as const;

/** Màu gán lần lượt cho danh mục tạo mới (theo số danh mục hiện có). */
export const CATEGORY_COLORS = ['#1F9C4F', '#2B9EF3', '#8B5CF6', '#C9820B', '#0E9B94', '#E0457B', '#6E48E6', '#2563EB'] as const;

const PAL: Record<string, [tint: string, icon: string]> = {
  '#1F9C4F': ['#EDFAF3', 'ic-spark'],
  '#2B9EF3': ['#EFF7FF', 'ic-gift'],
  '#8B5CF6': ['#F3EEFE', 'ic-box'],
  '#C9820B': ['#FFF8EC', 'ic-doc'],
  '#0E9B94': ['#E6F6F4', 'ic-box'],
  '#E0457B': ['#FDEEF3', 'ic-gift'],
  '#6E48E6': ['#F1EDFD', 'ic-spark'],
  '#2563EB': ['#EEF3FE', 'ic-box'],
};

/** `[nền, chữ / icon, tên icon]` của thẻ sản phẩm theo màu danh mục. */
export function categoryPal(color: string | null | undefined): [string, string, string] {
  const c = (color ?? '').toUpperCase();
  const p = PAL[c];
  return p ? [p[0], c, p[1]] : ['#F3F4F6', c || '#6B7280', 'ic-box'];
}

/** Kênh bán (card "Nguồn đồng bộ đa kênh"): kênh nhắn tin đã kết nối = `synced`; sàn / phần mềm bán hàng = sắp có (D04). */
export const SALES_SOURCES = [
  { key: 'zalo_personal', color: '#0068FF', channel: true },
  { key: 'webchat', color: '#2DC56A', channel: true },
  { key: 'shopee', color: '#EE4D2D', channel: false },
  { key: 'tiktok_shop', color: '#111111', channel: false },
  { key: 'sapo', color: '#0088FF', channel: false },
  { key: 'kiotviet', color: '#1763F4', channel: false },
] as const;
