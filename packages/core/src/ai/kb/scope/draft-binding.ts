// Nháp / gợi ý AI của hội thoại phụ thuộc nguồn tri thức (TIP-020c §3.7–3.8): nháp ghi kèm run sinh ra nó + thế hệ nháp (CAS cùng lúc ghi
// chữ); gợi ý copilot đã mang `run_id`. Đọc (danh sách / thread), dùng / gửi và đặt chỗ gửi đều kiểm run đó còn dùng được nguồn —
// nguồn bị xoá / chuyển / đổi quyền / nạp lại / agent tạm dừng → nháp / gợi ý ẩn (không chỉ ẩn trích dẫn). Nháp tay (không run) không bị
// chặn; chữ tự gõ lại không bị dò bằng so chuỗi. `message.send.ai_draft_ref` chỉ là tham chiếu mờ server kiểm — KHÔNG cấp quyền.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { knowledgeCurrent, staleRuns } from './provenance';
import { assertDraftPublication } from '../../sales-behavior/publication';

type Db = Pick<TenantDb, 'aiRun' | 'aiAgent' | 'aiAgentVersion' | '$queryRaw'>;

/** Ghi nháp AI khi người chưa có nháp (CAS `ai_draft IS NULL`) — run nguồn + thế hệ tăng cùng câu lệnh. */
export async function writeAiDraft(db: Pick<TenantDb, 'conversation'> | Pick<TenantTx, 'conversation'>, conversationId: string, text: string, runId: string | null): Promise<void> {
  await db.conversation.updateMany({ where: { id: conversationId, aiDraft: null }, data: { aiDraft: text.slice(0, 4000), aiDraftRunId: runId, aiDraftGen: { increment: 1 } } });
}

/** Trường nháp cho `conversation.update` có sẵn (handoff / tiếp quản): run nguồn + thế hệ mới. */
export const draftFields = (text: string, runId: string | null) => ({ aiDraft: text.slice(0, 4000), aiDraftRunId: runId, aiDraftGen: { increment: 1 } });

type ConvLite = { id: string; aiDraft: string | null; aiDraftRunId: string | null; aiDraftGen: number; aiSuggestion: unknown };

const suggestionRun = (v: unknown) => {
  const r = (v as { run_id?: unknown } | null)?.run_id;
  return typeof r === 'string' ? r : null;
};

/** Danh sách hội thoại: hội thoại có nháp / gợi ý phụ thuộc nguồn không còn hợp lệ → id trong tập trả về (ẩn khi chiếu DTO). */
export async function staleAiContent(db: Db, convs: readonly ConvLite[]): Promise<{ drafts: Set<string>; suggestions: Set<string> }> {
  const stale = await staleRuns(db, convs.flatMap((c) => [c.aiDraft ? c.aiDraftRunId : null, suggestionRun(c.aiSuggestion)]));
  const drafts = new Set(convs.filter((c) => c.aiDraft && c.aiDraftRunId && stale.has(c.aiDraftRunId)).map((c) => c.id));
  const suggestions = new Set(convs.filter((c) => stale.has(suggestionRun(c.aiSuggestion) ?? '')).map((c) => c.id));
  return { drafts, suggestions };
}

/** Gợi ý copilot của một hội thoại còn dùng được không (thread). */
export async function suggestionCurrent(db: Db, v: unknown): Promise<boolean> {
  const r = suggestionRun(v);
  return !r || (await knowledgeCurrent(db, r));
}

export interface DraftRef {
  id: string;
  generation: number;
}

/** Tham chiếu nháp cho client: chỉ khi nháp có run (nháp tay không cần). `id` = run sinh nháp — mờ với client, không mang quyền. */
export const draftRefOf = (c: Pick<ConvLite, 'aiDraft' | 'aiDraftRunId' | 'aiDraftGen'>): DraftRef | null => (c.aiDraft && c.aiDraftRunId ? { id: c.aiDraftRunId, generation: c.aiDraftGen } : null);

/**
 * Gửi kèm `ai_draft_ref` (trong transaction `message.send`, sau khoá hội thoại): phải khớp nháp hiện tại của CHÍNH hội thoại này (run +
 * thế hệ) và nguồn còn hợp lệ. Lệch / của hội thoại khác / nguồn hết hiệu lực → 409 `ai_draft: stale` (lý do an toàn, không lộ nguồn).
 * Trả run để ghi lên outbox (đặt chỗ gửi kiểm lại trước khi gọi kênh). Không ref → null (tin tay, gửi như cũ). TIP-022c: `sender` = người
 * gửi hiện tại — nháp có câu tồn / giá thì kiểm lại tồn dưới quyền người đó (409 `ai_draft: stock_changed | stock_unverified | invalidated`).
 */
export async function verifyDraftRef(tx: TenantTx, c: Pick<ConvLite, 'aiDraftRunId' | 'aiDraftGen' | 'aiSuggestion'>, ref: DraftRef | undefined, sender?: { authz: AuthzContext; now: Date }): Promise<string | null> {
  if (!ref) return null;
  const draft = !!c.aiDraftRunId && ref.id === c.aiDraftRunId && ref.generation === c.aiDraftGen;
  // Gợi ý copilot: thế hệ 0 + đúng run của gợi ý đang hiện.
  const suggestion = ref.generation === 0 && ref.id === suggestionRun(c.aiSuggestion);
  if (!draft && !suggestion) throw new AppError('INVALID_STATE', 409, { ai_draft: 'stale' });
  if (!(await knowledgeCurrent(tx as unknown as Db, ref.id))) throw new AppError('INVALID_STATE', 409, { ai_draft: 'knowledge_revoked' });
  // TIP-022c §3.8: câu tồn / giá của nháp — quan sát lại dưới quyền người gửi HIỆN TẠI (không phải grant cũ của agent); đổi → 409, chữ giữ.
  if (sender) await assertDraftPublication(tx, ref.id, sender.authz, sender.now);
  return ref.id;
}

/** Tham chiếu gợi ý copilot cho client (thế hệ 0). */
export const suggestionRefOf = (v: unknown): DraftRef | null => {
  const r = suggestionRun(v);
  return r ? { id: r, generation: 0 } : null;
};

/** Đặt chỗ gửi: tin phụ thuộc nguồn (outbox mang run) — nguồn hết hiệu lực trước khi gọi kênh → không gửi. */
export async function dispatchKnowledgeOk(tx: TenantTx, knowledgeRunId: string | null): Promise<boolean> {
  if (!knowledgeRunId) return true;
  // TIP-020d: run trả lời có chế độ trích dẫn chỉ gửi được khi câu trả lời đã kiểm xong (không gửi ứng viên đang chờ / không hợp lệ).
  const r = await tx.aiRun.findUnique({ where: { id: knowledgeRunId }, select: { citationPhase: true } });
  if (r?.citationPhase && r.citationPhase !== 'validated') return false;
  return knowledgeCurrent(tx as unknown as Db, knowledgeRunId);
}
