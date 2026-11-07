// Trí nhớ khi gộp khách (TIP-015b, thay `updateMany` của contact.merge): khoá cả hai khách theo id tăng dần, chụp lossless fact hai phía vào
// biên nhận `contact_memory_merge` (hoàn tác 7 ngày, không đọc vào model), dời fact bản phụ sang bản chính — trùng văn bản (trigram ≥ 0.9)
// với fact bản chính thì bỏ (bản chính giữ, lấy tin cậy cao hơn), rồi giữ trần 50 theo `evictionOrder`. Hoàn tác: bản sửa trí nhớ của
// bản chính phải còn đúng `after_rev` (không ai nhớ / xoá sau gộp) → trả đúng hai phía; lệch → 409 STALE_VERSION, giữ biên nhận tới hết hạn.
// Quét xoá biên nhận hết hạn: lô id trước theo (expires_at, id), SKIP LOCKED — biên nhận đang hoàn tác không bị xoá dưới tay.
import { AppError } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { DUP_SIMILARITY, MEMORY_CAP, evictionOrder } from './normalize';
import { allOf, lockContacts, restoreRows, snap, unsnap, type MemoryRow, type MemorySnap } from './repository';
import { bump, revisionOf } from './revision';

export const MERGE_UNDO_MS = 7 * 86_400_000;
const PURGE_BATCH = 200;

export interface MergePlan {
  /** Fact bản chính có sau gộp (trước trần). */
  total: number;
  /** Fact bản phụ trùng văn bản với bản chính (bỏ). */
  duplicates: number;
  /** Fact ra khỏi tập 50 vì trần. */
  evicted: number;
}

async function dupIds(tx: TenantTx, primaryId: string, dupId: string): Promise<Set<string>> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT d.id FROM contact_memory d WHERE d.contact_id = ${dupId}::uuid AND EXISTS (
      SELECT 1 FROM contact_memory p WHERE p.contact_id = ${primaryId}::uuid AND (p.fact_norm = d.fact_norm OR similarity(p.fact_norm, d.fact_norm) >= ${DUP_SIMILARITY}))`;
  return new Set(rows.map((r) => r.id));
}

/** Kế hoạch (preview — không ghi). */
export async function planMerge(tx: TenantTx, primaryId: string, dupId: string): Promise<MergePlan> {
  const [p, d, dups] = await Promise.all([allOf(tx, primaryId), allOf(tx, dupId), dupIds(tx, primaryId, dupId)]);
  const total = p.length + d.length - dups.size;
  return { total, duplicates: dups.size, evicted: Math.max(0, total - MEMORY_CAP) };
}

/** Gộp trí nhớ trong transaction contact.merge. Trả id biên nhận (lưu vào action_log.before để hoàn tác). */
export async function mergeMemory(tx: TenantTx, primaryId: string, dupId: string, now: Date): Promise<{ receiptId: string; plan: MergePlan }> {
  await lockContacts(tx, [primaryId, dupId]);
  const [pRows, dRows, dups] = await Promise.all([allOf(tx, primaryId), allOf(tx, dupId), dupIds(tx, primaryId, dupId)]);
  for (const d of dRows.filter((r) => dups.has(r.id))) {
    // Trùng: bản chính giữ dòng của mình, nhận tin cậy cao hơn.
    await tx.$executeRaw`UPDATE contact_memory p SET confidence = greatest(p.confidence, ${d.confidence}::real)
      WHERE p.contact_id = ${primaryId}::uuid AND (p.fact_norm = ${d.factNorm} OR similarity(p.fact_norm, ${d.factNorm}) >= ${DUP_SIMILARITY})`;
  }
  await tx.contactMemory.deleteMany({ where: { id: { in: [...dups] } } });
  await tx.contactMemory.updateMany({ where: { contactId: dupId }, data: { contactId: primaryId } });
  const merged = await allOf(tx, primaryId);
  const out = merged.length > MEMORY_CAP ? evictionOrder(merged).slice(0, merged.length - MEMORY_CAP) : [];
  if (out.length) await tx.contactMemory.deleteMany({ where: { id: { in: out.map((r) => r.id) } } });
  await bump(tx, dupId, 'memory', now);
  const rev = await bump(tx, primaryId, 'memory', now);
  const receiptId = uuidv7(now.getTime());
  await tx.contactMemoryMerge.create({
    data: { id: receiptId, primaryId, dupId, primaryRows: pRows.map(snap), dupRows: dRows.map(snap), afterRev: rev.memoryRev, expiresAt: new Date(now.getTime() + MERGE_UNDO_MS), createdAt: now },
  });
  return { receiptId, plan: { total: pRows.length + dRows.length - dups.size, duplicates: dups.size, evicted: out.length } };
}

/** Hoàn tác (trong undo của contact.merge, đã khoá theo thứ tự). Biên nhận thiếu (đã quét) → không đụng trí nhớ. */
export async function unmergeMemory(tx: TenantTx, receiptId: string, now: Date, checkRev = true): Promise<void> {
  const r = await tx.contactMemoryMerge.findUnique({ where: { id: receiptId } });
  if (!r) return;
  await lockContacts(tx, [r.primaryId, r.dupId]);
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM contact_memory_merge WHERE id = ${receiptId}::uuid FOR UPDATE`;
  if (!locked.length) return;
  if (checkRev && (await revisionOf(tx, r.primaryId)).memoryRev !== r.afterRev) throw new AppError('STALE_VERSION', 409, { memory: 'changed_after_merge' });
  const back = (rows: unknown) => (rows as MemorySnap[]).map(unsnap);
  await tx.contactMemory.deleteMany({ where: { contactId: { in: [r.primaryId, r.dupId] } } });
  await restoreRows(tx, [...back(r.primaryRows), ...back(r.dupRows)] as MemoryRow[]);
  await bump(tx, r.primaryId, 'memory', now);
  await bump(tx, r.dupId, 'memory', now);
  await tx.contactMemoryMerge.delete({ where: { id: r.id } });
}

/** Quét biên nhận hết hạn (idempotent, lô 200, bỏ qua dòng đang khoá). Trả số đã xoá. */
export async function purgeMergeReceipts(db: TenantDb, now: Date): Promise<number> {
  let total = 0;
  for (;;) {
    const n = await db.$transaction(async (tx) => {
      const ids = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM contact_memory_merge WHERE expires_at < ${now} ORDER BY expires_at, id LIMIT ${PURGE_BATCH} FOR UPDATE SKIP LOCKED`;
      if (!ids.length) return 0;
      // Kiểm lại hạn dưới khoá trước khi xoá.
      return tx.contactMemoryMerge.deleteMany({ where: { id: { in: ids.map((x) => x.id) }, expiresAt: { lt: now } } }).then((x) => x.count);
    });
    total += n;
    if (n < PURGE_BATCH) return total;
  }
}
