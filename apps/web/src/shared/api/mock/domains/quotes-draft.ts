// AI soạn báo giá từ nội dung (D30, COMMERCE §12) — bản mock không gọi LLM: khớp tên sản phẩm trong catalog,
// giá luôn lấy từ catalog; cụm "<số> buổi / x<số>" là số lượng; "giảm N%" là chiết khấu tổng; dòng không khớp → ngoài danh mục (buộc duyệt).
import type { Discount } from '@appchat/shared';
import type { MockDb } from '../store';
import type { QuoteItem } from './quotes';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

export function draftFromContent(
  db: MockDb,
  content: string,
): { items: QuoteItem[]; discount: Discount | null; offCatalog: number } {
  const parts = content
    .split(/\+|,|;|\n| và /)
    .map((x) => x.trim())
    .filter(Boolean);
  const products = db.products.products.filter((p) => !p.deleted);
  const items: QuoteItem[] = [];
  let off = 0;
  let discount: Discount | null = null;
  for (const part of parts) {
    const pct = norm(part).match(/giam\s*(\d{1,2})\s*%/);
    if (pct) {
      discount = { kind: 'pct', value: Number(pct[1]) };
      continue;
    }
    const key = norm(part);
    const hit = products.find((p) => {
      const words = norm(p.name)
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .slice(0, 2);
      return words.length > 0 && words.every((w) => key.includes(w));
    });
    const qty = Number(key.match(/(\d+)\s*(buoi|lan|hop|cai|x)\b/)?.[1] ?? key.match(/x\s*(\d+)/)?.[1] ?? 1);
    if (hit)
      items.push({
        product_id: hit.id,
        name: hit.name,
        qty: hit.sessions && key.includes('buoi') ? 1 : qty,
        unit_price: hit.price,
        tax_rate: hit.tax_rate,
      });
    else if (/[a-z]/.test(key) && key.length > 3) {
      off++;
      items.push({ name: part.slice(0, 80), qty, unit_price: '0', tax_rate: 8 });
    }
  }
  return {
    items: items.length ? items : [{ name: content.slice(0, 80), qty: 1, unit_price: '0', tax_rate: 8 }],
    discount,
    offCatalog: items.length ? off : 1,
  };
}
