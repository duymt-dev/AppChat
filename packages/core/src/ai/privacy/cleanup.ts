// Erase AI (TIP-015c §2.3 hàng 5) — fence publication + xoá input/output/state cài ở pha sau (ingress/evidence).
// TIP-021b: binding soạn agent thuộc họ khách (qua gốc run gắn hội thoại của khách) → vô hiệu: xoá chữ thô + đề xuất đã công bố, giữ id /
// khoá lần soạn (gửi lại cùng request_id nhận 409, không bao giờ trả lại đề xuất cũ). TIP-023g: đề xuất theo bản ghi gắn việc follow /
// lịch hẹn của khách → vô hiệu tương tự. TIP-020d: run trả lời của khách → xoá sổ bí danh + binding trích dẫn + ứng viên riêng (phần
// ai_run khác — input / output / bước — thuộc pha erase AI của 015c, vẫn NOT_IMPLEMENTED cho tới khi cài). TIP-022c: biên nhận ý định
// khách → vô hiệu + xoá liên kết (giữ id / khoá nguồn chống phát lại); căn cứ công bố → vô hiệu + bỏ danh sách sản phẩm. TIP-020e:
// vector chỉ mục của nguồn học từ hội thoại khách → xoá vector + space + generation ở CẢ HAI khe (lần tái tạo đang chạy không ghi lại
// được: vị từ nguồn còn hiệu lực đã loại khách bị "Quên" lúc ghi lô). Kind AI khác chưa có erase.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { invalidateDraft } from '../agents/drafting/publication';
import { invalidateProposal } from '../assistant/record-intent/publication';
import { eraseSalesIntent } from '../sales-behavior/privacy';
import { erasePublication } from '../sales-behavior/publication';

export const AI_DRAFT_KIND = 'agent_draft_publication';
export const AI_RECORD_PROPOSAL_KIND = 'record_proposal';
export const AI_SALES_INTENT_KIND = 'ai_sales_intent';
export const AI_SALES_PUBLICATION_KIND = 'ai_sales_publication';
export const KB_INDEX_VECTOR_KIND = 'kb_index_vector';

/** Xoá vector hai khe của một nguồn (giữ chunk id — trích dẫn cũ chỉ còn tham chiếu, không còn vector để truy hồi). */
export async function eraseKbVectors(tx: Pick<TenantTx, '$executeRaw'>, sourceId: string): Promise<void> {
  await tx.$executeRaw`UPDATE kb_chunk SET embedding = NULL, embedding_b = NULL, embed_space_a = NULL, embed_space_b = NULL, embed_generation_a = NULL, embed_generation_b = NULL
    WHERE source_id = ${sourceId}::uuid`;
}

/** Xoá phần trích dẫn của run (sổ / binding / ứng viên) — giữ pha `failed` để chi tiết run không tái dựng nguồn. */
export async function eraseRunCitations(tx: Pick<TenantTx, 'aiRun'>, runId: string): Promise<void> {
  await tx.aiRun.updateMany({ where: { id: runId, citationPhase: { not: null } }, data: { citationRegistry: [], citationPhase: 'failed', answerCitations: { v: 1, state: 'invalid', answer_generation: 1, answer_step_idx: null, reply_digest: null, citations: [], reason: 'privacy_erased' } } });
}

export async function eraseAiArtifact(tx: TenantTx, a: { kind: string; recordId: string }): Promise<void> {
  if (a.kind === AI_DRAFT_KIND) return invalidateDraft(tx, a.recordId, 'privacy_erased');
  if (a.kind === AI_RECORD_PROPOSAL_KIND) return invalidateProposal(tx, a.recordId, 'privacy_erased');
  if (a.kind === AI_SALES_INTENT_KIND) return eraseSalesIntent(tx, a.recordId);
  if (a.kind === AI_SALES_PUBLICATION_KIND) return erasePublication(tx, a.recordId);
  if (a.kind === KB_INDEX_VECTOR_KIND) return eraseKbVectors(tx, a.recordId);
  throw new AppError('NOT_IMPLEMENTED', 501, undefined, `privacy erase ai/${a.kind} chưa cài`);
}
