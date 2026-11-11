// Khôi phục binding trích dẫn (TIP-020d §2.3): finalizer chết sau khi engine xong → nạp lại ứng viên (hoặc chữ cuối của run) + sổ bí danh +
// quyền nguồn hiện hành, kiểm lại CỤC BỘ rồi chốt — không gọi lại provider, không tạo trích dẫn bằng cách truy hồi lại nguồn đã đổi. Run
// thất bại / huỷ / không còn chữ → failed USAGE_UNKNOWN. Không gửi khách (lượt đã mất; người xử lý theo nháp / gợi ý hiện có).
import type { TenantDb } from '@appchat/db';
import { parseAgentReply } from '@appchat/ai';
import { CITATION_LEASE_MS, OPEN_PHASES, failOpen, finalizeAnswer } from './publication';

type Db = Parameters<typeof finalizeAnswer>[0] & Pick<TenantDb, 'aiRun'>;
const OPEN = OPEN_PHASES;

/**
 * Khôi phục (≤ 100 dòng / lần, index `ai_run_citation_recovery_idx`): pha mở quá lease / run đã dừng. Có ứng viên + run xong → kiểm lại
 * cục bộ và chốt; run xong nhưng chưa có ứng viên → chữ cuối của run (output) làm ứng viên; run thất bại / huỷ → failed. Không gửi khách.
 */
export async function recoverCitations(db: Db, now: Date): Promise<{ validated: number; invalidated: number; failed: number }> {
  const out = { validated: 0, invalidated: 0, failed: 0 };
  const rows = await db.aiRun.findMany({
    where: { citationPhase: { in: [...OPEN] }, startedAt: { lt: new Date(now.getTime() - CITATION_LEASE_MS) } },
    orderBy: [{ citationPhase: 'asc' }, { startedAt: 'asc' }, { id: 'asc' }],
    take: 100,
    select: { id: true, status: true, citationPhase: true, answerCitations: true, output: true, input: true },
  });
  for (const r of rows) {
    const cur = (r.answerCitations ?? {}) as { candidate?: { raw?: string }; lease_until?: string };
    if (r.citationPhase === 'validating' && cur.lease_until && Date.parse(cur.lease_until) > now.getTime()) continue;
    if (['running', 'queued', 'waiting_approval', 'waiting_child'].includes(r.status)) continue;
    const raw = cur.candidate?.raw ?? (r.status === 'completed' ? ((r.output ?? {}) as { text?: string }).text : undefined);
    if (r.status !== 'completed' || typeof raw !== 'string') {
      await failOpen(db, r.id, 'USAGE_UNKNOWN');
      out.failed++;
      continue;
    }
    const pii = ((r.input ?? {}) as { pii?: Record<string, string> }).pii ?? {};
    const o = await finalizeAnswer(db, r.id, raw, parseAgentReply(raw), pii, now);
    if (o?.kind === 'invalid') out.invalidated++;
    else if (o) out.validated++;
  }
  return out;
}
