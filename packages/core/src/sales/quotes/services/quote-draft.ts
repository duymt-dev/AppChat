// AI soạn báo giá từ nội dung (templates.md §5, COMMERCE §12): model trích ý định `{ lines: [{ text, qty }], discount_pct }` từ ghi chú
// / đoạn chat; mỗi dòng khớp danh mục bằng tìm sản phẩm đang bán (giá + thuế LUÔN lấy từ catalog, không lấy số model đưa). Dòng không
// khớp → ngoài danh mục (đơn giá 0, buộc duyệt). Model không chạy / sai định dạng → bộ luật tách cụm theo "+ , ; và xuống dòng",
// "<n> buổi / x<n>" là số lượng, "giảm N%" là chiết khấu tổng (như bản mock FE).
import { z } from 'zod';
import { foldText, type Discount } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { LineIn } from './quote-write';

export interface Intent {
  lines: { text: string; qty: number }[];
  discountPct: number | null;
}

const MAX_LINES = 30;

export function draftPrompt(content: string): { system: string; prompt: string } {
  return {
    system: [
      '# QUOTE DRAFT',
      'Bạn đọc ghi chú / đoạn chat bán hàng tiếng Việt và liệt kê các hàng hoá / dịch vụ khách muốn mua kèm số lượng.',
      'Không tự đặt giá. "text" là tên hàng như trong nội dung. Chiết khấu trên tổng (nếu có, theo %) → "discount_pct".',
      'Chỉ trả về MỘT khối JSON: {"lines":[{"text":string,"qty":number}],"discount_pct":number|null}',
    ].join('\n'),
    prompt: content.slice(0, 8000),
  };
}

const outSchema = z.object({
  lines: z.array(z.object({ text: z.string().trim().min(1).max(200), qty: z.number().positive().max(100_000).catch(1) })).max(MAX_LINES),
  discount_pct: z.number().min(0).max(100).nullable().catch(null),
});

export function parseIntent(text: string): Intent | null {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const r = outSchema.safeParse(JSON.parse(text.slice(a, b + 1)));
    return r.success && r.data.lines.length ? { lines: r.data.lines, discountPct: r.data.discount_pct } : null;
  } catch {
    return null;
  }
}

export function intentByRules(content: string): Intent {
  let discountPct: number | null = null;
  const lines: Intent['lines'] = [];
  for (const raw of content.split(/\+|,|;|\n| và /)) {
    const part = raw.trim();
    if (!part) continue;
    const key = foldText(part);
    const pct = key.match(/giam\s*(\d{1,2})\s*%/);
    if (pct) {
      discountPct = Number(pct[1]);
      continue;
    }
    if (!/[a-z]/.test(key) || key.length <= 3) continue;
    const qty = Number(key.match(/(\d+)\s*(buoi|lan|hop|cai|chai|goi|bo)\b/)?.[1] ?? key.match(/x\s*(\d+)/)?.[1] ?? 1);
    lines.push({ text: part.slice(0, 200), qty: qty > 0 ? qty : 1 });
  }
  return { lines: lines.slice(0, MAX_LINES), discountPct };
}

const STOP = new Set(['goi', 'buoi', 'lan', 'combo', 'dich', 'vu', 'san', 'pham', 'cho', 'cua', 'them', 'lay']);
const words = (s: string) => foldText(s).split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Khớp một dòng ý định với sản phẩm đang bán: mọi từ khoá (tối đa 3 từ đầu) của tên sản phẩm có trong dòng; dài hơn thắng. */
export async function matchCatalog(tx: TenantTx, intent: Intent): Promise<{ items: LineIn[]; discount: Discount | null; offCatalog: number }> {
  const products = await tx.product.findMany({ where: { deletedAt: null, status: 'active' }, select: { id: true, name: true, price: true, taxRate: true, sessions: true }, take: 2000 });
  const keyed = products.map((p) => ({ p, keys: words(p.name).slice(0, 3) })).filter((x) => x.keys.length);
  const items: LineIn[] = [];
  let off = 0;
  for (const l of intent.lines) {
    const have = new Set(words(l.text));
    const hit = keyed.filter((x) => x.keys.every((k) => have.has(k))).sort((a, b) => b.keys.length - a.keys.length)[0]?.p;
    if (hit) {
      // Gói nhiều buổi bán theo gói: "8 buổi" của gói 8 buổi = 1 gói.
      const qty = hit.sessions && hit.sessions === l.qty ? 1 : l.qty;
      items.push({ product_id: hit.id, name: hit.name, qty, unit_price: String(hit.price), tax_rate: hit.taxRate });
    } else {
      off++;
      items.push({ name: l.text, qty: l.qty, unit_price: '0', tax_rate: 8 });
    }
  }
  const discount: Discount | null = intent.discountPct ? { kind: 'pct', value: intent.discountPct } : null;
  return { items, discount, offCatalog: off };
}
