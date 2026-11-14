// Publish một generation (TIP-020e §2.5): MỘT transaction khoá `kb_setting` (FOR UPDATE — thứ tự khoá: setting → generation), kiểm lại
// pha `catching_up` + lease đúng + đủ đoạn (mọi đoạn của nguồn còn hiệu lực đều có vector khe đích đúng generation + đúng space) → đổi
// `active_slot` / `active_generation_id` / `active_space`, `index_state='current'`, generation `active`, generation cũ `superseded`, outbox
// `kb.index_published`. Kết quả muộn của lease cũ / publish trùng → không đổi gì (CAS). Thiếu đoạn → không publish (catch-up chạy tiếp).
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { writeOutbox } from '../../../kernel/outbox/outbox';
import { LINKED } from '../scope/query';
import { inEventTransaction } from '../../../kernel/outbox/transaction';
import { slotCols, type Slot } from './space';

/** Nguồn còn hiệu lực cho chỉ mục (020c): sống, đã nạp, cho AI học, bản ghi gắn còn hợp lệ (sản phẩm sống; nguồn hội thoại của khách
 *  chưa bị "Quên" — 015c). Đoạn của nguồn khác không cần vector khe đích và KHÔNG bao giờ được gửi đi embed lại. */
export const LIVE_SOURCE = Prisma.sql`s.deleted_at IS NULL AND s.status = 'ready' AND s.learn AND ${LINKED}`;

/** Đoạn còn hiệu lực chưa có vector khe đích đúng generation (đoạn mới / nguồn nạp lại trong lúc chạy) — chỉ đếm, không đọc nội dung. */
export async function missingCount(db: Pick<TenantDb, '$queryRaw'>, slot: Slot, generationId: string): Promise<number> {
  const k = slotCols(slot);
  const [r] = await db.$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id
    WHERE ${LIVE_SOURCE} AND ${k.gen} IS DISTINCT FROM ${generationId}::uuid`;
  return Number(r?.n ?? 0);
}

export type PublishResult = { published: true } | { published: false; reason: 'lost_lease' | 'incomplete'; missing?: number };

export async function publishGeneration(db: TenantDb, ws: string, g: { id: string; slot: Slot; spaceKey: string; token: string }, now: Date): Promise<PublishResult> {
  return inEventTransaction(db, ws, async (tx: TenantTx) => {
    await tx.$queryRaw`SELECT 1 FROM kb_setting WHERE id = 1 FOR UPDATE`;
    const cur = await tx.kbEmbedGeneration.findUnique({ where: { id: g.id }, select: { phase: true, leaseToken: true } });
    if (!cur || cur.phase !== 'catching_up' || cur.leaseToken !== g.token) return { published: false, reason: 'lost_lease' } as const;
    const missing = await missingCount(tx, g.slot, g.id);
    if (missing > 0) return { published: false, reason: 'incomplete', missing } as const;
    const prev = await tx.kbSetting.findUnique({ where: { id: 1 }, select: { activeGenerationId: true } });
    await tx.kbEmbedGeneration.update({ where: { id: g.id }, data: { phase: 'active', leaseToken: null, leaseUntil: null, updatedAt: now, version: { increment: 1 } } });
    if (prev?.activeGenerationId && prev.activeGenerationId !== g.id)
      await tx.kbEmbedGeneration.updateMany({ where: { id: prev.activeGenerationId, phase: 'active' }, data: { phase: 'superseded', reason: 'replaced', updatedAt: now, version: { increment: 1 } } });
    await tx.kbSetting.upsert({
      where: { id: 1 },
      create: { id: 1, activeSlot: g.slot, activeGenerationId: g.id, activeSpace: g.spaceKey, indexState: 'current' },
      update: { activeSlot: g.slot, activeGenerationId: g.id, activeSpace: g.spaceKey, indexState: 'current', staleSince: null, version: { increment: 1 } },
    });
    await writeOutbox(tx, ws, [{ topic: 'kb.index_published', payload: { generation_id: g.id, slot: g.slot } }], now);
    return { published: true } as const;
  });
}
