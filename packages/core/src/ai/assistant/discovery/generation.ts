// Giành MỘT lần dựng kho cho (corpus_hash, embedding_space) nguyên tử (TIP-023e §1.3, §1.5): INSERT ... ON CONFLICT DO NOTHING —
// gốc khác thấy cùng cặp đang `building` thì KHÔNG giành lease thứ hai, chỉ đọc lại dòng đã có (trả về như "đang dựng", không tạo
// batch song song). Transaction nền tảng/tenant của action KHÔNG mở ở đây — hàm này chỉ ghi dòng phiếu, không gọi provider (lời gọi
// provider luôn chạy NGOÀI transaction, ở build processor pha sau).
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../../../kernel/ids';
import type { EmbeddingSpace } from './types';
import { embeddingSpaceKey } from './types';

export type GenerationPhase = 'building' | 'ready' | 'failed' | 'unknown';

export interface GenerationRow {
  id: string;
  phase: GenerationPhase;
  buildOperationId: string;
  ownerRootRunId: string;
  expectedCount: number;
  completedCount: number;
  failedReason: string | null;
}

type Db = Pick<TenantDb, 'actionDiscoveryGeneration'>;

const toRow = (r: { id: string; phase: string; buildOperationId: string; ownerRootRunId: string; expectedCount: number; completedCount: number; failedReason: string | null }): GenerationRow => ({
  id: r.id,
  phase: r.phase as GenerationPhase,
  buildOperationId: r.buildOperationId,
  ownerRootRunId: r.ownerRootRunId,
  expectedCount: r.expectedCount,
  completedCount: r.completedCount,
  failedReason: r.failedReason,
});

/** Generation hiện có của (corpus_hash, embedding_space) — null nếu chưa ai dựng (§1.3 UNIQUE(corpus_hash, embedding_space)). */
export async function findGeneration(db: Db, corpusHash: string, space: EmbeddingSpace): Promise<GenerationRow | null> {
  const r = await db.actionDiscoveryGeneration.findUnique({ where: { corpusHash_embeddingSpace: { corpusHash, embeddingSpace: embeddingSpaceKey(space) } } });
  return r ? toRow(r) : null;
}

export type ClaimResult = { kind: 'claimed' | 'reclaimed'; generation: GenerationRow } | { kind: 'existing'; generation: GenerationRow };

/**
 * Giành lease dựng kho — nguyên tử, không khoá dòng qua mạng (§1.5 "giải phóng transaction nền tảng trước khi gọi provider").
 * Thắng (`claimed`): generation mới ở phase `building`, ràng với operation/root ĐÃ xác nhận qua `assistant.discovery_prepare`.
 * `reclaimed`: generation CÙNG khoá đã từng `failed` — một xác nhận MỚI (bounds/budget đã kiểm lại) được phép thử lại, CAS
 * `failed → building` trên ĐÚNG dòng cũ (không tạo dòng thứ hai — UNIQUE(corpus_hash, embedding_space) chỉ cho một dòng sống;
 * không có đường reclaim thì một lần dựng hỏng sẽ khoá vĩnh viễn corpus/space đó, đi ngược §1.5 "A different authorized root
 * may continue only after a fresh explicit discovery_prepare confirmation... a new bounded claim is committed").
 * Thua (`existing`): một gốc khác đang building/ready/unknown — KHÔNG mở lease thứ hai, trả đúng dòng đang có để người gọi tự
 * quyết (dùng kho ready sẵn có, hay trả fallback `corpus_building`/`corpus_unknown` — không bao giờ launch batch song song).
 */
export async function claimGeneration(db: Db, i: { corpusHash: string; space: EmbeddingSpace; buildOperationId: string; ownerRootRunId: string; expectedCount: number; now: Date }): Promise<ClaimResult> {
  const id = uuidv7(i.now.getTime());
  const spaceKey = embeddingSpaceKey(i.space);
  try {
    const created = await db.actionDiscoveryGeneration.create({
      data: { id, corpusHash: i.corpusHash, embeddingSpace: spaceKey, phase: 'building', buildOperationId: i.buildOperationId, ownerRootRunId: i.ownerRootRunId, expectedCount: i.expectedCount, completedCount: 0, createdAt: i.now, updatedAt: i.now },
    });
    return { kind: 'claimed', generation: toRow(created) };
  } catch (e) {
    // Vi phạm UNIQUE(corpus_hash, embedding_space) — gốc khác đã giành trước (race bình thường, không phải lỗi).
    if ((e as { code?: string })?.code !== 'P2002') throw e;
    const existing = await findGeneration(db, i.corpusHash, i.space);
    if (!existing) throw e; // dòng vừa bị xoá giữa hai lệnh — cực hiếm, để người gọi thử lại.
    if (existing.phase !== 'failed') return { kind: 'existing', generation: existing };
    const reclaimed = await db.actionDiscoveryGeneration.updateMany({
      where: { id: existing.id, phase: 'failed' },
      data: { phase: 'building', buildOperationId: i.buildOperationId, ownerRootRunId: i.ownerRootRunId, expectedCount: i.expectedCount, completedCount: 0, failedReason: null, updatedAt: i.now },
    });
    if (reclaimed.count === 0) {
      // Gốc khác reclaim trước (race trên CAS) — đọc lại, không tự coi mình thắng.
      const fresh = await findGeneration(db, i.corpusHash, i.space);
      return { kind: 'existing', generation: fresh ?? existing };
    }
    return { kind: 'reclaimed', generation: { ...existing, phase: 'building', buildOperationId: i.buildOperationId, ownerRootRunId: i.ownerRootRunId, expectedCount: i.expectedCount, completedCount: 0, failedReason: null } };
  }
}

/** Một batch đã ghi xong embedding (build processor — pha sau) — tăng completed_count; đủ expected_count thì tự chuyển `ready`.
 *  CAS theo phase hiện còn `building` — generation đã failed/ready ở tiến trình khác thì không tăng đè. */
export async function advanceGeneration(db: Db, generationId: string, by: number, now: Date): Promise<GenerationRow | null> {
  const updated = await db.actionDiscoveryGeneration.updateMany({ where: { id: generationId, phase: 'building' }, data: { completedCount: { increment: by }, updatedAt: now } });
  if (updated.count === 0) return null;
  const row = await db.actionDiscoveryGeneration.findUnique({ where: { id: generationId } });
  if (!row || row.completedCount < row.expectedCount) return row ? toRow(row) : null;
  const done = await db.actionDiscoveryGeneration.updateMany({ where: { id: generationId, phase: 'building' }, data: { phase: 'ready', updatedAt: now } });
  return done.count ? { ...toRow(row), phase: 'ready' } : toRow(row);
}

/** Dựng thất bại (lỗi hạ tầng / usage không rõ ở build processor) — CAS theo `building` (không đè `ready` đã hoàn tất trước đó). */
export async function failGeneration(db: Db, generationId: string, reason: string, now: Date): Promise<void> {
  await db.actionDiscoveryGeneration.updateMany({ where: { id: generationId, phase: 'building' }, data: { phase: 'failed', failedReason: reason.slice(0, 300), updatedAt: now } });
}
