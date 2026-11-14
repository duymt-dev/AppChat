// Fence công bố bản soạn (TIP-021b §3.6): mọi chuyển pha là UPDATE có điều kiện (id + pha + thế hệ kiểm) — huỷ / mất quyền / vô hiệu
// thắng (không đè pha cuối). Chữ thô của model chỉ ở `protected_result` trong lúc chờ kiểm; công bố / từ chối / vô hiệu đều xoá nó.
// Run / biên nhận / quyết toán vẫn ở 019b — bảng này không tính tiền. Khôi phục: chữ đã lưu được kiểm lại dưới cùng fence, không gọi model.
import { TenantSql } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { DRAFT_LEASE_MS } from './admission';
import type { DraftCandidate, DraftDiscovery } from './discovery';

type Tx = Pick<TenantTx, 'agentDraftPublication'>;
const OPEN = ['awaiting_generation', 'awaiting_validation'] as const;
const lease = (now: Date) => new Date(now.getTime() + DRAFT_LEASE_MS);

/** Lưu ứng viên + vân tay của lần soạn (trạng thái riêng của binding, không cache dùng chung). */
export async function bindCandidates(tx: Tx, id: string, d: DraftDiscovery, now: Date): Promise<void> {
  const discovery = { strategy: d.strategy, ...(d.reason ? { reason: d.reason } : {}), corpus_version: d.corpusVersion };
  await tx.agentDraftPublication.updateMany({
    where: { id, phase: 'awaiting_generation' },
    data: { candidates: d.candidates as unknown as object, candidateFingerprint: d.fingerprint, discovery, leaseUntil: lease(now) },
  });
}

/** Model đã trả (khuôn đã kiểm ở engine) — lưu riêng, sang `awaiting_validation`, tăng thế hệ. Trả thế hệ mới, hoặc null nếu mất CAS. */
export async function recordGenerated(tx: Tx, id: string, text: string, now: Date): Promise<number | null> {
  const r = await tx.agentDraftPublication.updateMany({
    where: { id, phase: 'awaiting_generation' },
    data: { phase: 'awaiting_validation', protectedResult: text, validationGeneration: { increment: 1 }, leaseUntil: lease(now) },
  });
  if (!r.count) return null;
  return (await tx.agentDraftPublication.findUnique({ where: { id }, select: { validationGeneration: true } }))?.validationGeneration ?? null;
}

/**
 * Công bố đề xuất đã kiểm — chỉ khi pha còn mở và thế hệ đúng cái người kiểm đã đọc (`generation` null = bản tất định, chưa từng có chữ
 * model, pha phải còn `awaiting_generation`). Mất CAS (huỷ / vô hiệu / tiến trình khác đã công bố) → false, người gọi đọc lại.
 */
export async function publishDraft(tx: Tx, id: string, generation: number | null, result: object): Promise<boolean> {
  const where = generation === null ? { id, phase: 'awaiting_generation' as const } : { id, phase: 'awaiting_validation' as const, validationGeneration: generation };
  const r = await tx.agentDraftPublication.updateMany({ where, data: { phase: 'published', publishedResult: result, protectedResult: null, safeReason: null } });
  return r.count > 0;
}

/** Dừng cứng (credit / ngân sách / huỷ / usage không rõ / quyền) — pha cuối có mã an toàn, không chữ thô, không đề xuất. */
export async function rejectDraft(tx: Tx, id: string, reason: string): Promise<void> {
  await tx.agentDraftPublication.updateMany({ where: { id, phase: { in: [...OPEN] } }, data: { phase: 'rejected', protectedResult: null, safeReason: reason.slice(0, 60) } });
}

/** Ứng viên đổi / quyền nguồn mất / Quên khách — vô hiệu cả bản đã công bố (người đọc sau không thấy lại đề xuất cũ). */
export async function invalidateDraft(tx: Tx, id: string, reason: string): Promise<void> {
  await tx.agentDraftPublication.updateMany({
    where: { id, phase: { in: [...OPEN, 'published'] } },
    data: { phase: 'invalidated', protectedResult: null, publishedResult: TenantSql.DbNull, safeReason: reason.slice(0, 60) },
  });
}

export const candidatesOf = (raw: unknown): DraftCandidate[] => (Array.isArray(raw) ? (raw as DraftCandidate[]) : []);
export const discoveryOf = (raw: unknown) => (raw ?? {}) as { strategy?: 'hybrid' | 'keyword' | 'none'; reason?: string; corpus_version?: string | null };

export const DRAFT_RECOVERY_BATCH = 100;

/**
 * Quét khôi phục (lịch 045b, ROLE=jobs): `awaiting_generation` quá lease = tiến trình chết quanh lời gọi model — usage có thể đã phát
 * sinh (019b xử lý), KHÔNG gọi lại → `rejected` USAGE_UNKNOWN. `awaiting_validation` quá lease: chữ đã bền nhưng không còn người gọi
 * để kiểm theo quyền của họ → giữ tới khi gửi lại cùng request_id (kiểm lại dưới fence), quá `abandonMs` thì vô hiệu + xoá chữ thô.
 * Trang id ≤ 100 theo index khôi phục (phase, updated_at, id) — không đọc payload riêng ở bước chọn trang.
 */
export async function recoverDrafts(tx: Pick<TenantTx, 'agentDraftPublication'>, now: Date, abandonMs: number): Promise<{ unknown: number; abandoned: number }> {
  const due = await tx.agentDraftPublication.findMany({
    where: { phase: { in: [...OPEN] }, leaseUntil: { lt: now } },
    orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
    take: DRAFT_RECOVERY_BATCH,
    select: { id: true, phase: true, updatedAt: true },
  });
  let unknown = 0;
  let abandoned = 0;
  for (const b of due) {
    if (b.phase === 'awaiting_generation') {
      await rejectDraft(tx, b.id, 'USAGE_UNKNOWN');
      unknown++;
    } else if (now.getTime() - b.updatedAt.getTime() > abandonMs) {
      await invalidateDraft(tx, b.id, 'abandoned');
      abandoned++;
    }
  }
  return { unknown, abandoned };
}
