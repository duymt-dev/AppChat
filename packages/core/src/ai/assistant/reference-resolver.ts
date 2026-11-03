// Mã hiển thị → id theo đường dẫn schema (TIP-023b SPEC A.3, R1.6): chỉ ô khai trong input schema của action — `<thực thể>_id` ở mọi tầng
// (`items[].product_id`, `patch.owner_user_id` không có bảng mã thì bỏ qua) và `id` ở gốc (= `<thực thể của action>_id`). Chuỗi tự do
// (ghi chú "KH-123") không bị đổi. Tra theo mã trong scope của người gọi: bản ghi ngoài scope coi như không có → giữ nguyên mã (handler trả
// 404 như mã sai — không xác nhận sự tồn tại của bản ghi bị ẩn).
import type { ActionDef } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { visibleAppointment } from '../../booking/booking-access';
import { visibleContract } from '../../contracts/contract-access';
import { visibleContact } from '../../crm/services/access';
import { visibleOrder } from '../../sales/orders/order-access';
import { visibleInvoice } from '../../sales/payments/invoice-access';
import { visibleQuote } from '../../sales/quotes/quote-access';
import { visibleTicket } from '../../support/ticket-access';
import { inputSchemaOf } from '../runs/tools';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mã hiển thị: chữ + số, có gạch ngang (KH-1016, BG-1003, TKT-0001, LH-1001). */
const CODE = /^[A-Za-zĐđ]{1,6}-?\d{1,8}$/;

type Db = TenantDb | TenantTx;
type Find = (db: Db, code: string) => Promise<{ id: string } | null>;
/** Kiểm thấy được (ném 404 khi ngoài scope) — vắng = danh mục chung (sản phẩm). */
type Visible = (tx: TenantTx, authz: AuthzContext, id: string) => Promise<unknown>;

const LOOKUPS: Record<string, { find: Find; visible?: Visible }> = {
  contact: { find: (db, code) => db.contact.findFirst({ where: { code, deletedAt: null }, select: { id: true } }), visible: visibleContact },
  quote: { find: (db, code) => db.quote.findFirst({ where: { code }, orderBy: { version: 'desc' }, select: { id: true } }), visible: visibleQuote },
  order: { find: (db, code) => db.order.findFirst({ where: { code }, select: { id: true } }), visible: visibleOrder },
  invoice: { find: (db, code) => db.invoice.findFirst({ where: { code }, select: { id: true } }), visible: visibleInvoice },
  contract: { find: (db, code) => db.contract.findFirst({ where: { code }, select: { id: true } }), visible: visibleContract },
  appointment: { find: (db, code) => db.appointment.findFirst({ where: { code }, select: { id: true } }), visible: visibleAppointment },
  ticket: { find: (db, code) => db.ticket.findFirst({ where: { code }, select: { id: true } }), visible: visibleTicket },
  product: { find: (db, code) => db.product.findFirst({ where: { code, deletedAt: null }, select: { id: true } }) },
};

/** Thực thể đổi được mã → id (test phủ Trợ lý — TIP-023b R1.3). */
export const REF_ENTITIES: readonly string[] = Object.keys(LOOKUPS);

type Node = { type?: unknown; properties?: Record<string, Node>; items?: Node; anyOf?: Node[]; oneOf?: Node[] };
/** Đoạn đường dẫn: tên ô, hoặc `[]` = mọi phần tử mảng. */
export type RefPath = { path: string[]; entity: string };

function walk(n: Node | undefined, at: string[], out: RefPath[], depth: number) {
  if (!n || depth > 4) return;
  for (const alt of n.anyOf ?? n.oneOf ?? []) walk(alt, at, out, depth);
  if (n.items) walk(n.items, [...at, '[]'], out, depth + 1);
  for (const [k, v] of Object.entries(n.properties ?? {})) {
    const entity = k.endsWith('_id') ? k.slice(0, -3) : null;
    if (entity && LOOKUPS[entity]) out.push({ path: [...at, k], entity });
    else walk(v, [...at, k], out, depth + 1);
  }
}

const PATHS = new Map<string, RefPath[]>();

/** Ô tham chiếu của action theo schema (cache theo id action — schema tĩnh). `id` gốc = id của thực thể action. */
export function refPaths(def: Pick<ActionDef, 'id' | 'input'>): RefPath[] {
  const hit = PATHS.get(def.id);
  if (hit) return hit;
  const out: RefPath[] = [];
  const root = inputSchemaOf(def as ActionDef) as Node;
  walk(root, [], out, 0);
  // Model hay gửi `id` cho `<thực thể>_id` của chính action (zod sẽ bỏ ô lạ) → đổi rồi đặt đúng tên ô.
  const own = def.id.split('.')[0]!;
  if (LOOKUPS[own]) out.push({ path: ['id'], entity: own });
  PATHS.set(def.id, out);
  return out;
}

const norm = (v: string) => v.trim().toUpperCase().replace(/^([A-ZĐ]+)(\d)/, '$1-$2');

async function lookup(db: Db, authz: AuthzContext | null, entity: string, raw: string): Promise<string | null> {
  const l = LOOKUPS[entity]!;
  const row = (await l.find(db, raw.trim())) ?? (await l.find(db, norm(raw)));
  if (!row) return null;
  if (!authz || !l.visible) return row.id;
  try {
    await l.visible(db as TenantTx, authz, row.id);
    return row.id;
  } catch {
    return null;
  }
}

export interface Resolved {
  input: unknown;
  /** Đường dẫn ô đã đổi (`items.0.product_id`) — ghi vào bước run để soát. */
  resolved: string[];
}

/**
 * Đổi mã → id theo đường dẫn schema. `authz` = người hiệu lực của lời gọi (vắng = chỉ tra tồn tại — gọi nội bộ đã kiểm scope sau đó).
 * Không đổi input gốc (trả bản sao).
 */
export async function resolveReferences(db: Db, def: Pick<ActionDef, 'id' | 'input'>, input: unknown, authz: AuthzContext | null): Promise<Resolved> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { input, resolved: [] };
  const out = structuredClone(input) as Record<string, unknown>;
  const resolved: string[] = [];
  const visit = async (node: unknown, path: string[], entity: string, at: string[]): Promise<unknown> => {
    if (!path.length) {
      if (typeof node !== 'string' || UUID.test(node) || !CODE.test(node.trim())) return node;
      const id = await lookup(db, authz, entity, node);
      if (id) resolved.push(at.join('.'));
      return id ?? node;
    }
    const [head, ...rest] = path as [string, ...string[]];
    if (head === '[]') {
      if (!Array.isArray(node)) return node;
      for (let i = 0; i < node.length; i++) node[i] = await visit(node[i], rest, entity, [...at, String(i)]);
      return node;
    }
    if (!node || typeof node !== 'object' || Array.isArray(node) || !(head in node)) return node;
    const o = node as Record<string, unknown>;
    o[head] = await visit(o[head], rest, entity, [...at, head]);
    return o;
  };
  for (const r of refPaths(def)) await visit(out, r.path, r.entity, []);
  // `id` không phải tên ô thật của action → đặt đúng `<thực thể>_id`.
  if (resolved.includes('id')) {
    const own = def.id.split('.')[0]!;
    out[`${own}_id`] ??= out.id;
    delete out.id;
  }
  return { input: out, resolved };
}
