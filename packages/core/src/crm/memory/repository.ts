// Ghi / đọc `contact_memory` (TIP-015b). Mọi ghi chạy trong transaction action SAU khi khoá dòng `contact` (FOR UPDATE) — 51 lệnh nhớ đồng
// thời cùng khách xếp hàng trên khoá này nên trần 50 + chống trùng luôn đúng. Trùng văn bản: pg_trgm similarity(fact_norm, norm) ≥ 0.9 trên
// ≤ 50 dòng của khách (lọc bằng index contact_id); trùng → làm mới thời điểm / nguồn / tin cậy (lấy cao hơn), không thêm dòng.
import { uuidv7 } from '../../kernel/ids';
import type { TenantTx } from '../../kernel/actions/action-context';
import { DUP_SIMILARITY, MEMORY_CAP, evictionOrder } from './normalize';

export interface MemoryRow {
  id: string;
  contactId: string;
  fact: string;
  factNorm: string;
  confidence: number;
  sourceRunId: string | null;
  sourceStepId: string | null;
  actorType: string | null;
  actorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Provenance {
  runId: string | null;
  stepId: string | null;
  actorType: string;
  actorId: string | null;
}

/** Khoá dòng khách (thứ tự khoá: contact trước memory). */
export async function lockContact(tx: TenantTx, contactId: string) {
  await tx.$queryRaw`SELECT 1 FROM contact WHERE id = ${contactId}::uuid FOR UPDATE`;
}

/** Khoá nhiều khách theo id tăng dần (gộp / hoàn tác gộp — tránh deadlock cặp ngược). */
export async function lockContacts(tx: TenantTx, ids: string[]) {
  for (const id of [...new Set(ids)].sort()) await lockContact(tx, id);
}

export const allOf = (tx: TenantTx, contactId: string) =>
  tx.contactMemory.findMany({ where: { contactId }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }] }) as Promise<MemoryRow[]>;

/** Dòng trùng văn bản (similarity cao nhất ≥ ngưỡng) của khách — đã khoá contact. */
export async function similarOf(tx: TenantTx, contactId: string, norm: string): Promise<{ id: string; sim: number } | null> {
  const rows = await tx.$queryRaw<{ id: string; sim: number }[]>`
    SELECT id, similarity(fact_norm, ${norm})::float8 AS sim FROM contact_memory
    WHERE contact_id = ${contactId}::uuid AND (fact_norm = ${norm} OR similarity(fact_norm, ${norm}) >= ${DUP_SIMILARITY})
    ORDER BY (fact_norm = ${norm}) DESC, sim DESC, id LIMIT 1`;
  return rows[0] ?? null;
}

export interface WriteResult {
  status: 'created' | 'refreshed';
  row: MemoryRow;
  evicted: MemoryRow | null;
  /** Dòng trước khi làm mới (để hoàn tác). */
  before: MemoryRow | null;
}

/** Ghi một fact (contact đã khoá): trùng → làm mới; đầy → bỏ fact theo `evictionOrder` rồi thêm. */
export async function writeFact(tx: TenantTx, contactId: string, f: { fact: string; norm: string; confidence: number }, p: Provenance, now: Date): Promise<WriteResult> {
  const prov = { sourceRunId: p.runId, sourceStepId: p.stepId, actorType: p.actorType, actorId: p.actorId };
  const dup = await similarOf(tx, contactId, f.norm);
  if (dup) {
    const before = (await tx.contactMemory.findUniqueOrThrow({ where: { id: dup.id } })) as MemoryRow;
    const row = (await tx.contactMemory.update({
      where: { id: dup.id },
      data: { ...prov, confidence: Math.max(before.confidence, f.confidence), updatedAt: now },
    })) as MemoryRow;
    return { status: 'refreshed', row, evicted: null, before };
  }
  const all = await allOf(tx, contactId);
  let evicted: MemoryRow | null = null;
  if (all.length >= MEMORY_CAP) {
    // Hơn trần (dữ liệu cũ trước TIP) → bỏ dần tới còn 49 rồi thêm.
    const out = evictionOrder(all).slice(0, all.length - MEMORY_CAP + 1);
    evicted = out[0] ?? null;
    await tx.contactMemory.deleteMany({ where: { id: { in: out.map((r) => r.id) } } });
  }
  const row = (await tx.contactMemory.create({
    data: { id: uuidv7(now.getTime()), contactId, fact: f.fact, factNorm: f.norm, confidence: f.confidence, ...prov, createdAt: now, updatedAt: now },
  })) as MemoryRow;
  return { status: 'created', row, evicted, before: null };
}

/** Ảnh chụp dòng (JSON — hoàn tác / biên nhận gộp). */
export const snap = (r: MemoryRow) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() });
export type MemorySnap = ReturnType<typeof snap>;
export const unsnap = (s: MemorySnap): MemoryRow => ({ ...s, createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt) });

/** Thêm lại dòng từ ảnh chụp (giữ id) — bỏ qua nếu id đã có. */
export async function restoreRows(tx: TenantTx, rows: MemoryRow[]) {
  if (!rows.length) return;
  await tx.contactMemory.createMany({ data: rows, skipDuplicates: true });
}
