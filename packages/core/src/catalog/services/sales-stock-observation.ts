// Quan sát tồn kho cho câu trả lời bán hàng (TIP-022c §3.1–3.3) — cài cổng trung lập `kernel/actions/sales-publication.ts`. Chỉ đọc,
// trong transaction của bên gọi, cùng luật chiếu với `product.get` / `stock.get` (sản phẩm đang bán, chưa xoá; không giá vốn / trường nội
// bộ). Vật lý: còn khi tồn ≥ số lượng khách hỏi (> 0); 0 / âm / thiếu → `shortage` (tồn âm vẫn hợp lệ ở sổ đơn); không đọc được → `unknown`
// (không bao giờ coi là hết hàng hay còn hàng). Dịch vụ / liệu trình / số / thuê: không quản lý tồn. Combo: duyệt thành phần thật, nhân số
// lượng, gộp lá lặp, ≤ 50 thành phần khác nhau và ≤ 5 cấp, vòng / số lượng sai / thành phần thiếu → `unknown`; thành phần dịch vụ không
// khiến combo "chắc chắn giao được" — kết luận tổng chỉ nói phần vật lý. Không giữ hàng, không đổi tồn, không ETA.
import { createHash } from 'node:crypto';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { StockClaim, StockObservation, StockObservationResult, StockRequest } from '../../kernel/actions/sales-publication';
import { UUID } from './catalog-write';

export const MAX_COMBO_COMPONENTS = 50;
export const MAX_COMBO_DEPTH = 5;
const TRACKED = 'physical';
const NOT_TRACKED = new Set(['service', 'package', 'digital', 'rental']);

type Row = { id: string; code: string; name: string; type: string; unit: string; price: bigint; stock: number | null; status: string; deletedAt: Date | null };
type Edge = { productId: string; childId: string; qty: number };

const SELECT = { id: true, code: true, name: true, type: true, unit: true, price: true, stock: true, status: true, deletedAt: true } as const;

/** Lá vật lý của một combo (đã nhân số lượng, gộp lặp) — hoặc lý do không xác định được. */
async function leavesOf(tx: TenantTx, rootId: string): Promise<{ leaves: Map<string, number> } | { reason: string }> {
  const leaves = new Map<string, number>();
  const seen = new Set<string>();
  // Mỗi tầng một truy vấn (≤ 5 tầng) — đường đi hiện tại để phát hiện vòng.
  let level: { id: string; mult: number; path: string[] }[] = [{ id: rootId, mult: 1, path: [rootId] }];
  for (let depth = 0; level.length; depth++) {
    if (depth >= MAX_COMBO_DEPTH) return { reason: 'combo_too_deep' };
    const edges: Edge[] = await tx.productComponent.findMany({ where: { productId: { in: [...new Set(level.map((l) => l.id))] } }, select: { productId: true, childId: true, qty: true } });
    const children = await tx.product.findMany({ where: { id: { in: [...new Set(edges.map((e) => e.childId))] } }, select: { id: true, type: true, status: true, deletedAt: true } });
    const byId = new Map(children.map((c) => [c.id, c]));
    const next: typeof level = [];
    for (const l of level) {
      const own = edges.filter((e) => e.productId === l.id);
      if (!own.length) return { reason: 'combo_component_missing' };
      for (const e of own) {
        if (!Number.isInteger(e.qty) || e.qty <= 0) return { reason: 'combo_invalid_qty' };
        if (l.path.includes(e.childId)) return { reason: 'combo_cycle' };
        const c = byId.get(e.childId);
        if (!c || c.deletedAt || c.status !== 'active') return { reason: 'combo_component_unavailable' };
        seen.add(e.childId);
        if (seen.size > MAX_COMBO_COMPONENTS) return { reason: 'combo_too_large' };
        const need = l.mult * e.qty;
        if (c.type === 'combo') next.push({ id: c.id, mult: need, path: [...l.path, c.id] });
        else if (c.type === TRACKED) leaves.set(c.id, (leaves.get(c.id) ?? 0) + need);
      }
    }
    level = next;
  }
  return { leaves };
}

const claimOf = (stock: number | null, need: number): StockClaim => (stock === null ? 'unknown' : stock >= need ? 'available_now' : 'shortage');

/** Quan sát theo lô: một truy vấn sản phẩm yêu cầu + mỗi combo ≤ 5 tầng + một lô tồn lá. Thứ tự đọc cố định theo id. */
export async function observeSalesStock(tx: TenantTx, requests: readonly StockRequest[], now: Date): Promise<StockObservationResult> {
  const ids = [...new Set(requests.map((r) => r.productId).filter((x) => UUID.test(x)))].sort();
  const rows: Row[] = ids.length ? await tx.product.findMany({ where: { id: { in: ids } }, select: SELECT, orderBy: { id: 'asc' } }) : [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const combos = new Map<string, Awaited<ReturnType<typeof leavesOf>>>();
  for (const r of rows) if (r.type === 'combo' && !r.deletedAt && r.status === 'active') combos.set(r.id, await leavesOf(tx, r.id));
  const leafIds = [...new Set([...combos.values()].flatMap((c) => ('leaves' in c ? [...c.leaves.keys()] : [])))].sort();
  const leafRows = leafIds.length ? await tx.product.findMany({ where: { id: { in: leafIds } }, select: { id: true, stock: true }, orderBy: { id: 'asc' } }) : [];
  const leafStock = new Map(leafRows.map((l) => [l.id, l.stock]));

  const items = requests.map((q): StockObservation => {
    const p = byId.get(q.productId);
    const base = { productId: q.productId, qty: q.qty };
    if (!p || p.deletedAt || p.status !== 'active') return { ...base, code: '', name: '', type: '', unit: '', price: '0', claim: 'unknown', stock: null, reason: 'not_found' };
    const view = { ...base, code: p.code, name: p.name, type: p.type, unit: p.unit, price: String(p.price) };
    if (!Number.isInteger(q.qty) || q.qty <= 0) return { ...view, claim: 'unknown', stock: null, reason: 'quantity_unclear' };
    if (NOT_TRACKED.has(p.type)) return { ...view, claim: 'not_stock_tracked', stock: null };
    if (p.type === TRACKED) return { ...view, claim: claimOf(p.stock, q.qty), stock: p.stock };
    const c = combos.get(p.id);
    if (!c || 'reason' in c) return { ...view, claim: 'unknown', stock: null, reason: c && 'reason' in c ? c.reason : 'combo_unresolved' };
    // Combo không có lá vật lý (toàn dịch vụ) → không quản lý tồn; có lá → còn chỉ khi MỌI lá đủ (số cần × số combo khách hỏi).
    if (!c.leaves.size) return { ...view, claim: 'not_stock_tracked', stock: null };
    const leaves = [...c.leaves.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, per]) => ({ productId: id, need: per * q.qty, stock: leafStock.get(id) ?? null }));
    const claims = leaves.map((l) => claimOf(l.stock, l.need));
    const claim: StockClaim = claims.includes('unknown') ? 'unknown' : claims.includes('shortage') ? 'shortage' : 'available_now';
    return { ...view, claim, stock: null, leaves, ...(claim === 'unknown' ? { reason: 'combo_leaf_unknown' } : {}) };
  });
  const digest = createHash('sha256').update(JSON.stringify(items.map((i) => [i.productId, i.qty, i.claim, i.stock, i.price, i.leaves?.map((l) => [l.productId, l.need, l.stock]) ?? null]))).digest('hex');
  return { items, checkedAt: now.toISOString(), digest };
}
