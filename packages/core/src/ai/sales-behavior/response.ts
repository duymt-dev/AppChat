// Dựng câu trả lời bán hàng từ kế hoạch có kiểu + quan sát hiện tại (TIP-022c §3.5): phần dẫn của model (đã kiểm không chứa số / khẳng
// định tồn / giá / giao hàng) + các câu tồn / giá / thay thế do server dựng bằng mẫu bản địa hoá. Kết luận model khác kết luận quan sát →
// không tự gửi (kế hoạch lệch dữ liệu thật); `unknown` → nói chưa kiểm được và chuyển người, không hứa.
import type { SalesPlan } from '@appchat/ai';
import { createFmt, interpolate, serverMessages } from '@appchat/shared';
import type { StockObservation, StockObservationResult } from '../../kernel/actions/sales-publication';
import { verifiedAlternatives } from './alternatives';

export type ResponseOutcome =
  | { kind: 'ready'; text: string; observationDigest: string; productIds: string[] }
  /** Model khai kết luận khác dữ liệu thật / sản phẩm không đọc được — không gửi chữ model; câu server dựng vẫn trả về làm nháp. */
  | { kind: 'mismatch'; text: string; observationDigest: string; productIds: string[]; mismatched: string[] }
  /** Có kết luận `unknown` — không hứa; chuyển người với nháp trung thực. */
  | { kind: 'unknown'; text: string; observationDigest: string; productIds: string[] };

const TYPES = new Set(['service', 'package', 'digital', 'rental', 'combo']);

function clause(o: StockObservation, locale: 'vi' | 'en', time: string): string {
  const t = serverMessages(locale).sales.advice;
  const fmt = createFmt({ locale });
  const vars = { name: o.name || o.code || '—', qty: o.qty, unit: o.unit, price: fmt.money(o.price), time };
  if (o.claim === 'available_now') return interpolate(t.available, vars);
  if (o.claim === 'shortage') return interpolate(o.leaves ? t.shortageCombo : t.shortage, vars);
  if (o.claim === 'not_stock_tracked') return interpolate(t.notTracked, { ...vars, type: TYPES.has(o.type) ? t.types[o.type as keyof typeof t.types] : o.type });
  return interpolate(t.unknown, vars);
}

/**
 * `observed` = quan sát sản phẩm khách hỏi; `alts` = quan sát thay thế model đề xuất (đã đọc cùng lượt). Giờ kiểm theo múi giờ workspace.
 * Câu cuối = phần dẫn + từng câu sản phẩm + (thiếu hàng → thay thế đã kiểm hoặc câu "chưa tìm được").
 */
export function renderSalesResponse(plan: SalesPlan, observed: StockObservationResult, alts: StockObservationResult | null, o: { locale: 'vi' | 'en'; timeZone: string }): ResponseOutcome {
  const t = serverMessages(o.locale).sales.advice;
  const fmt = createFmt({ locale: o.locale, timeZone: o.timeZone });
  const time = fmt.dateTime(observed.checkedAt);
  const byId = new Map(observed.items.map((i) => [i.productId, i]));
  const items = plan.items.map((p) => byId.get(p.product_id)!).filter(Boolean);
  const mismatched = plan.items.filter((p) => byId.get(p.product_id)?.claim !== p.claim).map((p) => p.product_id);
  const lines = [plan.narrative.trim(), ...items.map((i) => clause(i, o.locale, time))].filter(Boolean);
  if (items.some((i) => i.claim === 'shortage')) {
    const verified = alts ? verifiedAlternatives(plan.items.map((p) => p.product_id), alts.items) : [];
    if (verified.length) lines.push(t.alternativesHead, ...verified.map((v) => interpolate(t.alternative, { name: v.name, price: fmt.money(v.price), unit: v.unit, time: fmt.dateTime(alts!.checkedAt) })));
    else lines.push(t.noAlternative);
  }
  const text = lines.join('\n');
  const productIds = [...items.map((i) => i.productId), ...(alts?.items.map((i) => i.productId) ?? [])];
  const digest = [observed.digest, alts?.digest ?? ''].join(':');
  if (mismatched.length) return { kind: 'mismatch', text, observationDigest: digest, productIds, mismatched };
  if (items.some((i) => i.claim === 'unknown')) return { kind: 'unknown', text, observationDigest: digest, productIds };
  return { kind: 'ready', text, observationDigest: digest, productIds };
}
