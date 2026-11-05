// Soạn / viết lại tin Hộp thư (TIP-023c REQ-C05c): cổng CHỈ-ĐỀ-XUẤT — một run `consult` qua gateway + meter hiện có, KHÔNG tool (không
// action, không delegate, không lệnh UI), output là `proposed_text`. Không có đường ghi: chèn / thay vào ô soạn do người bấm, gửi vẫn là
// `message.send` qua ActionExecutor. Trước khi gọi model: kiểm `inbox.reply` + hội thoại trong scope HIỆN HÀNH (không thấy → 404, model
// không chạy). Ngữ cảnh server tự đọc: tin văn bản gần nhất của khách / nhân viên / agent — bỏ ghi chú nội bộ, tin hệ thống, tin đã xoá /
// thu hồi và mọi tệp (chỉ ghi "[tệp]"), nên ghi chú / @nhắc / nội dung tệp không lọt vào tin gửi khách.
import { prompt } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import { AppError, can, type AuthzContext } from '@appchat/shared';
import { visibleConversation } from '../../../inbox/services/access';
import { runOnce } from '../../agents/agent.runtime';
import type { AiRunner } from '../../runs/runner';

export const DRAFT_MAX = 8000;
export const DRAFT_CONTEXT_MESSAGES = 30;
export type DraftPurpose = 'inbox_compose' | 'inbox_rewrite';

export interface DraftRequest {
  ws: string;
  userId: string;
  userName: string;
  locale: string;
  authz: AuthzContext;
  purpose: DraftPurpose;
  conversationId: string;
  /** Phiên bản bản nháp người dùng lúc bấm — trả lại nguyên để client so (sửa trong lúc chờ → không ghi đè). */
  baseVersion: number;
  /** Bản nháp hiện tại (viết lại) / gợi ý ý chính (soạn). */
  draft: string;
  instruction?: string;
}

export interface DraftProposal {
  purpose: DraftPurpose;
  conversation_id: string;
  base_version: number;
  proposed_text: string;
  run_id: string;
  credits_used: number;
}

type Row = { senderType: string; kind: string; body: string; direction: string | null };

/** Dòng hội thoại cho model: chỉ tin trao đổi với khách; tệp / ảnh chỉ còn nhãn. */
export function transcript(rows: Row[]): string {
  return rows
    .filter((m) => m.kind !== 'note' && m.kind !== 'system' && m.senderType !== 'system')
    .map((m) => `${m.senderType === 'contact' ? 'KHÁCH' : 'SHOP'}: ${m.kind === 'text' ? m.body.slice(0, 1000) : '[tệp]'}`)
    .join('\n');
}

export async function draftReply(db: TenantDb, runner: AiRunner, now: () => Date, q: DraftRequest): Promise<DraftProposal> {
  if (!can(q.authz, 'inbox.reply')) throw new AppError('FORBIDDEN', 403, { permission: 'inbox.reply' });
  if (q.draft.length > DRAFT_MAX) throw new AppError('VALIDATION_FAILED', 422, { draft: 'too_long' });
  if (q.purpose === 'inbox_rewrite' && !q.draft.trim()) throw new AppError('VALIDATION_FAILED', 422, { draft: 'required' });
  const rows = await db.$transaction(async (tx) => {
    const c = await visibleConversation(tx, q.authz, q.conversationId);
    // Deferred: index (conversation_id, created_at DESC, id DESC) chọn trang id, payload chỉ cho đúng 30 dòng.
    const ids = await tx.message.findMany({ where: { conversationId: c.id, deletedAt: null, recalledAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: DRAFT_CONTEXT_MESSAGES, select: { id: true } });
    const page = await tx.message.findMany({ where: { id: { in: ids.map((r) => r.id) } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { senderType: true, kind: true, body: true, direction: true } });
    return page;
  });
  const task = q.purpose === 'inbox_rewrite' ? 'rewrite' : 'compose';
  const t = prompt('inbox-draft', q.locale, { user: q.userName, task: q.instruction ? `${task}: ${q.instruction.slice(0, 300)}` : task });
  const body = `HỘI THOẠI:\n${transcript(rows) || '(trống)'}\n\nBẢN NHÁP:\n${q.draft || '(trống)'}`;
  const r = await runOnce(db, runner, now, q.ws, {
    run: { kind: 'consult', title: `assistant.${q.purpose}`, tier: 'standard', initiatedByUserId: q.userId, conversationId: q.conversationId, input: { purpose: q.purpose, base_version: q.baseVersion } },
    system: t.text,
    prompt: body,
    source: 'inbox',
  });
  if (r.status !== 'completed') {
    const credit = r.error?.code === 'CREDIT_EXHAUSTED';
    throw new AppError(credit ? 'CREDIT_EXHAUSTED' : 'INTERNAL', credit ? 402 : 502, { run_id: r.runId });
  }
  return { purpose: q.purpose, conversation_id: q.conversationId, base_version: q.baseVersion, proposed_text: r.text.trim().slice(0, DRAFT_MAX), run_id: r.runId, credits_used: r.creditsUsed };
}
