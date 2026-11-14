// Đối soát tồn kho từ sàn / POS khi `stock_master = external` (TIP-031c, COMMERCE §4b L109): qua action riêng
// `order.system_stock_sync` với biên nhận `system_action_receipt` theo (connection_id, snapshot_id, sku). Chế độ `appchat` bỏ qua
// `pullStock`; SKU chưa có ở AppChat trả trong `unmatched_skus` (không tự tạo SP, không đóng biên nhận để đối soát lại sau).
import { Inject, Injectable } from '@nestjs/common';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { stockMasterOf, type OrderSyncProvider, type StockSnapshotItem } from '@appchat/integrations';
import type { ActionInput, SystemOutput, orderSystemStockSync } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { runSystemAction, settled, stableTriggerId, systemCapabilityOf, type SystemRunDeps, type SystemTrigger } from '../../../kernel/actions/system';
import { CLOCK, type Clock } from '../../../kernel/clock';
import { recordMovement } from '../../../catalog/public';
import { connectionCtx } from '../../../integrations/public';

const ACTION = 'order.system_stock_sync';
const OP = 'apply_stock_snapshot';
export const ORDER_STOCK_SYNC_ACTOR = 'order-stock-sync';

export interface StagedStock {
  connId: string;
  skuKey: string;
  productId: string;
  variantId: string | null;
  item: StockSnapshotItem;
}

export interface StockSyncOutcome {
  adjusted: number;
  unmatchedSkus: string[];
  failed: number;
  errors: string[];
}

const held = new Map<string, StagedStock>();
const refOf = (connId: string, skuKey: string) => `stock-sync:${connId}:${skuKey}`;

export function stockSyncTrigger(ws: string, connId: string, skuKey: string, snapshotId: string): SystemTrigger {
  const ref = refOf(connId, skuKey);
  const t = stableTriggerId('ingress', ref, ACTION, OP, connId, snapshotId, '');
  return {
    workspaceId: ws,
    actionId: ACTION,
    sourceKind: 'ingress',
    sourceRef: ref,
    targetId: connId,
    generation: snapshotId,
    milestone: '',
    input: { trigger_id: t, entity_id: connId, operation: OP },
    actor: ORDER_STOCK_SYNC_ACTOR,
    idempotencyKey: `system:${t}`,
  };
}

async function withStagedStock<T>(t: SystemTrigger, s: StagedStock, fn: () => Promise<T>): Promise<T> {
  const k = `${t.workspaceId}:${t.sourceRef}:${t.generation}`;
  held.set(k, s);
  try {
    return await fn();
  } finally {
    held.delete(k);
  }
}

function takeStaged(ws: string, ref: string, gen: string): StagedStock | null {
  const k = `${ws}:${ref}:${gen}`;
  const s = held.get(k) ?? null;
  held.delete(k);
  return s;
}

export async function verifyOrderStockSync(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string };
  if (
    t.sourceKind !== 'ingress' ||
    !t.sourceRef.startsWith(`stock-sync:${t.targetId}:`) ||
    i.entity_id !== t.targetId ||
    i.trigger_id !== stableTriggerId(t.sourceKind, t.sourceRef, ACTION, OP, t.targetId, t.generation, t.milestone ?? '')
  ) {
    throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  }
  const c = await db.integrationConnection.findUnique({ where: { id: t.targetId }, select: { port: true, status: true } });
  if (!c || c.port !== 'order_sync') throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if (c.status === 'disconnected') throw new AppError('CONFLICT', 409, { trigger: 'connection_disconnected' });
}

@Injectable()
@ActionHandler(ACTION)
export class OrderSystemStockSyncHandler implements Handler<ActionInput<typeof orderSystemStockSync>, SystemOutput> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof orderSystemStockSync>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    const s = takeStaged(ctx.workspaceId, cap.sourceRef, cap.generation);
    if (!s || s.connId !== i.entity_id || s.item.snapshot_id.trim() !== cap.generation) {
      throw new AppError('CONFLICT', 409, { snapshot: 'revision_missing' });
    }
    const [row] = await tx.$queryRaw<{ stock: number | null }[]>`
      SELECT stock FROM product WHERE id = ${s.productId}::uuid AND deleted_at IS NULL AND type = 'physical'::product_type FOR UPDATE`;
    if (!row) return { result: { disposition: 'no_effect', operation_id: i.entity_id, reason_code: 'product_unavailable' }, noUndo: true };
    const delta = s.item.on_hand - (row.stock ?? 0);
    if (delta === 0) {
      return { result: { disposition: 'no_effect', operation_id: i.entity_id, reason_code: 'in_sync' }, noUndo: true };
    }
    const r = await recordMovement(
      tx,
      {
        productId: s.productId,
        variantId: s.variantId,
        kind: 'sync_adjust',
        qty: delta,
        refType: 'sync_adjust',
        refId: `${s.connId}:${s.item.snapshot_id.trim()}:${s.skuKey}`,
        reason: `snapshot:${s.item.snapshot_id.trim()}`,
        actorId: null,
      },
      this.clock.now(),
    );
    return {
      result: {
        disposition: r.applied ? 'applied' : 'no_effect',
        operation_id: i.entity_id,
        ...(r.movementId ? { effect_ref: r.movementId } : {}),
        reason_code: r.applied ? 'adjusted' : 'duplicate_movement',
      },
      noUndo: true,
    };
  }
}

async function matchExternalSkus(db: TenantDb, rawSkus: string[]): Promise<Map<string, { productId: string; variantId: string | null }>> {
  const clean = [...new Set(rawSkus.map((s) => s.trim().toLowerCase()).filter(Boolean))];
  const out = new Map<string, { productId: string; variantId: string | null }>();
  if (!clean.length) return out;
  const [variants, products] = await Promise.all([
    db.$queryRaw<{ sku_lower: string; product_id: string; variant_id: string }[]>`
      SELECT lower(v.sku) AS sku_lower, v.product_id::text AS product_id, v.id::text AS variant_id
        FROM product_variant v
        JOIN product p ON p.id = v.product_id
       WHERE lower(v.sku) = ANY(${clean}::text[])
         AND v.status = 'active'::product_status
         AND p.deleted_at IS NULL
         AND p.type = 'physical'::product_type`,
    db.$queryRaw<{ code_lower: string; product_id: string }[]>`
      SELECT lower(code) AS code_lower, id::text AS product_id
        FROM product
       WHERE lower(code) = ANY(${clean}::text[])
         AND deleted_at IS NULL
         AND type = 'physical'::product_type`,
  ]);
  for (const p of products) out.set(p.code_lower, { productId: p.product_id, variantId: null });
  for (const v of variants) out.set(v.sku_lower, { productId: v.product_id, variantId: v.variant_id });
  return out;
}

type ConnRow = NonNullable<Awaited<ReturnType<TenantDb['integrationConnection']['findUnique']>>>;

export async function syncConnectionStock(sys: SystemRunDeps, db: TenantDb, ws: string, conn: ConnRow, adapter: OrderSyncProvider, key: Buffer): Promise<StockSyncOutcome> {
  const cfg = (conn.config ?? {}) as Record<string, unknown>;
  if (stockMasterOf(cfg) !== 'external' || !adapter.pullStock) {
    return { adjusted: 0, unmatchedSkus: [], failed: 0, errors: [] };
  }
  const cursor = typeof cfg.stock_cursor === 'string' && cfg.stock_cursor ? cfg.stock_cursor : null;
  const pulled = await adapter.pullStock(connectionCtx(conn, key), cursor);
  const skuMap = await matchExternalSkus(db, pulled.items.map((x) => x.sku));
  let adjusted = 0;
  let failed = 0;
  const errors: string[] = [];
  const unmatchedSet = new Set<string>();

  for (const item of pulled.items) {
    const skuRaw = item.sku.trim();
    const snapId = item.snapshot_id.trim();
    if (!skuRaw || !snapId) continue;
    const skuLower = skuRaw.toLowerCase();
    const match = skuMap.get(skuLower);
    if (!match) {
      unmatchedSet.add(skuRaw);
      continue;
    }
    const t = stockSyncTrigger(ws, conn.id, skuLower, snapId);
    try {
      if (await settled(sys, t)) continue;
      const r = await withStagedStock(
        t,
        { connId: conn.id, skuKey: skuLower, productId: match.productId, variantId: match.variantId, item },
        () => runSystemAction<SystemOutput>(sys.executor, sys.tenants, t),
      );
      const out = (r.data as { result: SystemOutput }).result;
      if (out.disposition === 'applied') adjusted++;
    } catch (e) {
      failed++;
      errors.push((e instanceof Error ? e.name : 'error').slice(0, 60));
    }
  }

  const nextCursor = pulled.next_cursor ?? null;
  if (failed === 0 && nextCursor !== cursor) {
    const fresh = await db.integrationConnection.findUnique({ where: { id: conn.id }, select: { config: true } });
    const latestCfg = (fresh?.config ?? cfg) as Record<string, unknown>;
    await db.integrationConnection.update({
      where: { id: conn.id },
      data: { config: { ...latestCfg, stock_cursor: nextCursor } as object },
    });
  }

  return { adjusted, unmatchedSkus: [...unmatchedSet], failed, errors };
}
