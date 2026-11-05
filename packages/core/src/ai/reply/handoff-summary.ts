// Tóm tắt bàn giao có cấu trúc (TIP-022b C) — MỌI đường chuyển người (tool handoff, độ tin cậy thấp, khiếu nại, credit / lỗi, không có
// agent đích, vòng chuyển, duyệt bị từ chối / hết hạn, ngoài giờ). Ưu tiên dữ liệu run đã kiểm (bước tool + kết quả thật); model không có /
// hết credit → dựng tất định (extractive), KHÔNG gọi thêm LLM. Không biết thì ghi không biết — không bịa kết quả thành công. Lưu riêng
// (`conversation.handoff_summary`), không nhồi vào `handoff_reason` 300 ký tự hay nháp gửi khách. Chiếu theo quyền người xem lúc mở.
import type { HandoffSummaryDto, AgentIntent } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import { attachmentInfo } from './attachment-context';

type Step = { actionId: string | null; status: string; input: unknown; output: unknown };

/** Kết quả thật của một bước tool → trạng thái hiển thị (chờ duyệt = pending, không phải xong). */
function stepStatus(s: Step): HandoffSummaryDto['actions'][number]['status'] {
  if (s.status === 'paused') return 'pending';
  const o = (s.output ?? {}) as { kind?: string; code?: string };
  if (s.status === 'error' || o.kind === 'error') return o.code === 'FORBIDDEN' || o.code === 'SCOPE_FORBIDDEN' ? 'denied' : 'error';
  if (o.kind === 'needs_approval' || o.kind === 'needs_confirmation' || o.kind === 'job') return 'pending';
  return 'ok';
}

const ID_KEYS = ['contact_id', 'quote_id', 'order_id', 'appointment_id', 'ticket_id', 'invoice_id', 'contract_id'] as const;

/** Tham chiếu bản ghi đã chạm trong run (id từ input / output thật) — người xem mở được hay không do quyền khi mở. */
function refsOf(steps: Step[]) {
  const out = new Map<string, { label: string; value: string; ref: { type: string; id: string } }>();
  for (const s of steps) {
    for (const src of [s.input, (s.output as { output?: unknown } | null)?.output]) {
      if (!src || typeof src !== 'object') continue;
      for (const k of ID_KEYS) {
        const v = (src as Record<string, unknown>)[k];
        if (typeof v === 'string' && v && !out.has(v)) out.set(v, { label: k, value: v, ref: { type: k.replace('_id', ''), id: v } });
      }
    }
  }
  return [...out.values()].slice(0, 8);
}

export interface SummaryInput {
  conversationId: string;
  runId: string | null;
  reason: string;
  intent: AgentIntent | null;
  /** Câu hỏi còn mở do model nêu (needs_human / summary của tool handoff) — đã kiểm độ dài, chữ thường. */
  modelNote?: string | null;
  now: Date;
}

/** Dựng tóm tắt từ dữ liệu đã lưu (tin khách cuối, bước tool của run). Không gọi model. */
export async function buildHandoffSummary(db: TenantDb, i: SummaryInput, version: number): Promise<HandoffSummaryDto> {
  const last = await db.message.findMany({
    where: { conversationId: i.conversationId, direction: 'in', deletedAt: null },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 3,
    select: { id: true, body: true, attachments: true },
  });
  const steps: Step[] = i.runId
    ? await db.aiRunStep.findMany({ where: { runId: i.runId, type: 'tool' }, orderBy: { idx: 'asc' }, take: 20, select: { actionId: true, status: true, input: true, output: true } })
    : [];
  const unreadable = last.reduce((n, m) => n + attachmentInfo(m.attachments).length, 0);
  const request = last.map((m) => m.body).reverse().join('\n').trim().slice(0, 500);
  const note = i.modelNote?.trim().slice(0, 300) ?? '';
  return {
    version,
    reason: i.reason.slice(0, 40),
    request,
    facts: refsOf(steps),
    actions: steps.filter((s) => s.actionId && !s.actionId.startsWith('meta')).slice(0, 12).map((s) => ({ action_id: s.actionId!, status: stepStatus(s), detail: '' })),
    unresolved: note || (unreadable ? 'attachment_unreadable' : ''),
    last_message_id: last[0]?.id ?? null,
    source: note ? 'model' : 'extractive',
    intent: i.intent,
    attachments_unreadable: unreadable,
    created_at: i.now.toISOString(),
  };
}

/** Số phiên bản kế tiếp của tóm tắt hội thoại (mỗi lần chuyển lý do bàn giao một phiên bản). */
export const nextSummaryVersion = (cur: unknown) => ((cur as { version?: number } | null)?.version ?? 0) + 1;

/**
 * Chiếu tóm tắt cho người xem (khi mở): bỏ tham chiếu bản ghi người xem không được thấy (`canSee` theo policy hiện tại, không theo người
 * tạo). Không bao giờ đi ra khách.
 */
export async function projectSummary(s: HandoffSummaryDto | null, canSee: (type: string, id: string) => Promise<boolean>): Promise<HandoffSummaryDto | null> {
  if (!s) return null;
  const facts = [];
  for (const f of s.facts) if (!f.ref || (await canSee(f.ref.type, f.ref.id))) facts.push(f);
  return { ...s, facts };
}

/**
 * Ghi bàn giao + tóm tắt NGUYÊN TỬ (cùng transaction với trạng thái + outbox `ai.handoff`): mỗi lần chuyển lý do một phiên bản tóm tắt;
 * run chạy lại / chạy tiếp sau duyệt cùng lý do không tạo phiên bản thứ hai (`summary.reason` + `last_message_id` trùng → giữ).
 */
export function summaryChanged(cur: unknown, next: Pick<HandoffSummaryDto, 'reason' | 'last_message_id'>): boolean {
  const c = cur as Partial<HandoffSummaryDto> | null;
  return !c || c.reason !== next.reason || c.last_message_id !== next.last_message_id;
}
