// Erase AI (TIP-015c §2.3 hàng 5) — fence publication + xoá input/output/state cài ở pha sau (ingress/evidence).
// TIP-021b: binding soạn agent thuộc họ khách (qua gốc run gắn hội thoại của khách) → vô hiệu: xoá chữ thô + đề xuất đã công bố, giữ id /
// khoá lần soạn (gửi lại cùng request_id nhận 409, không bao giờ trả lại đề xuất cũ). TIP-023g: đề xuất theo bản ghi gắn việc follow /
// lịch hẹn của khách → vô hiệu tương tự. Kind AI khác chưa có erase — không âm thầm no-op.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { invalidateDraft } from '../agents/drafting/publication';
import { invalidateProposal } from '../assistant/record-intent/publication';

export const AI_DRAFT_KIND = 'agent_draft_publication';
export const AI_RECORD_PROPOSAL_KIND = 'record_proposal';

export async function eraseAiArtifact(tx: TenantTx, a: { kind: string; recordId: string }): Promise<void> {
  if (a.kind === AI_DRAFT_KIND) return invalidateDraft(tx, a.recordId, 'privacy_erased');
  if (a.kind === AI_RECORD_PROPOSAL_KIND) return invalidateProposal(tx, a.recordId, 'privacy_erased');
  throw new AppError('NOT_IMPLEMENTED', 501, undefined, `privacy erase ai/${a.kind} chưa cài`);
}
