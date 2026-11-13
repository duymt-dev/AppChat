// Capability "ý định khách" cho quyết định báo giá (TIP-022c §1.7, §2.1): handle NỘI BỘ server-only — runtime agent (ai/sales-behavior)
// niêm phong vào đúng ctx object của một lời gọi tool sau khi biên nhận `ai_sales_intent` đã ghi; domain sales (customer-intent-guard)
// đọc lại BIÊN NHẬN đã lưu trong transaction hiệu ứng. Không có trường serialize / input công khai nào đúc được (WeakMap riêng của module
// này — giống capability action riêng 003c). Sự hiện diện của handle KHÔNG phải bằng chứng: guard luôn kiểm dòng DB + nguồn tin cậy.
import { createHash } from 'node:crypto';
import type { ActionContext, TenantTx } from './action-context';

/** Ý định đóng của khách (COMMERCE §3) ↔ action báo giá chuẩn. */
export const CUSTOMER_INTENT_ACTIONS = {
  'quote.mark_accepted': 'accept',
  'quote.request_revision': 'revise',
  'quote.mark_rejected': 'reject',
} as const;
export type CustomerIntentAction = keyof typeof CUSTOMER_INTENT_ACTIONS;
export type CustomerIntent = (typeof CUSTOMER_INTENT_ACTIONS)[CustomerIntentAction];

/** Ngưỡng cứng (COMMERCE §3) — so `>=` trên số thực, không làm tròn; ngưỡng bàn giao chung của agent không hạ được. */
export const CUSTOMER_INTENT_MIN_PCT = 70;

export const isCustomerIntentAction = (id: string): id is CustomerIntentAction => id in CUSTOMER_INTENT_ACTIONS;

export interface CustomerIntentHandle {
  /** id dòng `ai_sales_intent` (prepared) — guard đọc lại + tiêu thụ trong transaction hiệu ứng. */
  receiptId: string;
  actionId: CustomerIntentAction;
  quoteId: string;
  runId: string;
}

const SEALED = new WeakMap<ActionContext, Readonly<CustomerIntentHandle>>();

/** Chỉ runtime agent gọi, trên ctx object MỚI của một lời gọi tool (đã ghi biên nhận). */
export function sealCustomerIntent(ctx: ActionContext, h: CustomerIntentHandle): void {
  SEALED.set(ctx, Object.freeze({ ...h }));
}

export const customerIntentOf = (ctx: ActionContext): Readonly<CustomerIntentHandle> | undefined => SEALED.get(ctx);

/**
 * Lời gọi mang dòng dõi khách (agent / tác vụ / run con dưới lượt kênh): bắt buộc biên nhận ý định khách. Người dùng thật (ui / api)
 * và Trợ lý (assistant — luôn qua thẻ xác nhận của chính người dùng) giữ hành vi action chuẩn. Phạm vi xác định từ dòng dõi runtime, không
 * từ nhãn vai trò: đổi wrapper tool, vai trò custom hay bỏ `servedConversationId` không gỡ được yêu cầu này.
 */
export const needsCustomerIntent = (ctx: ActionContext): boolean => ctx.source === 'agent' || ctx.source === 'task' || ctx.actor.type === 'agent';

/** Dấu trạng thái báo giá lúc nhận ý định (status + phiên bản + tổng + lần cập nhật) — runtime ghi vào biên nhận, guard so lại dưới khoá. */
export function quoteFingerprint(q: { id: string; status: string; version: number; total: bigint | number | string; updatedAt: Date }): string {
  return createHash('sha256').update(`${q.id}|${q.status}|${q.version}|${String(q.total)}|${q.updatedAt.toISOString()}`).digest('hex').slice(0, 32);
}

/** Digest tập tin khách nguồn (id + nội dung, theo thứ tự) — runtime ghi lúc nhận, guard so lại dưới khoá; một công thức cho cả hai phía. */
export const sourceDigest = (msgs: readonly { id: string; body: string }[]) => createHash('sha256').update(JSON.stringify(msgs.map((m) => [m.id, m.body]))).digest('hex');

/**
 * Đường LỆNH NGƯỜI VẬN HÀNH (TIP-022c §2.2–2.2b): agent / tác vụ làm thay người (delegate của Trợ lý, Cowork — `onBehalfOfUserId`) gọi
 * quyết định báo giá mà không có căn cứ ý định khách. Không bao giờ tự chạy: executor đẩy sang hàng chờ duyệt — người thật xác nhận ĐÚNG
 * action + input + dấu báo giá đã ràng lúc xin duyệt. Lượt kênh (không có người ra lệnh) không vào đường này → domain 403.
 */
export const operatorDecisionPath = (ctx: ActionContext): boolean => needsCustomerIntent(ctx) && !customerIntentOf(ctx) && !!ctx.onBehalfOfUserId;

/** Cảnh báo trên thẻ xác nhận / duyệt: quyết định của người vận hành, KHÔNG phải ý định khách hệ thống phát hiện. */
export const OPERATOR_DECISION_WARNING = 'operator_decision';

/** Khoá dấu báo giá ràng lúc xem trước / xin duyệt (confirm_token của Trợ lý, `approval_request.preview.bound`) — server ghi, không qua client. */
export const QUOTE_BINDING_KEY = 'quote_fingerprint';

/** Dữ kiện ràng của quyết định báo giá: dấu trạng thái báo giá lúc xem trước / xin duyệt. */
export const quoteBinding = (q: Parameters<typeof quoteFingerprint>[0]): Record<string, string> => ({ [QUOTE_BINDING_KEY]: quoteFingerprint(q) });

/** Gộp với quyết định policy: lời gọi đường người vận hành chưa có duyệt → `approval` (cấm vẫn là cấm). */
export function escalateOperatorDecision<D extends string>(decision: D | 'approval', ctx: ActionContext, actionId: string): D | 'approval' {
  if (decision === 'forbidden' || !isCustomerIntentAction(actionId) || ctx.approvalId) return decision;
  return operatorDecisionPath(ctx) ? 'approval' : decision;
}

/** Kết quả xác minh: hợp lệ → tiêu thụ cùng transaction hiệu ứng; không → mã lý do + 403 (thiếu căn cứ) / 409 (đã dùng / đã đổi). */
export type OperatorAdmission = { ok: true; consume(actionLogId: string, now: Date): Promise<void> } | { ok: false; reason: string; status: 403 | 409 };

/**
 * Xác minh duyệt của người vận hành (dòng duyệt đã quyết bởi người thật, đúng người ra lệnh / run, dấu báo giá ràng lúc xin duyệt) — AI
 * (`ai/sales-behavior/command-provenance.ts`) đăng ký khi dựng cổng duyệt; domain sales gọi qua đây (không import AI). Chưa đăng ký → từ
 * chối (đóng an toàn).
 */
export type OperatorDecisionVerifier = (tx: TenantTx, ctx: ActionContext, actionId: CustomerIntentAction, quote: { id: string; fingerprint: string }) => Promise<OperatorAdmission>;
let verifier: OperatorDecisionVerifier | null = null;

export function registerOperatorDecisionVerifier(fn: OperatorDecisionVerifier): void {
  verifier = fn;
}

export const verifyOperatorDecision = (tx: TenantTx, ctx: ActionContext, actionId: CustomerIntentAction, quote: { id: string; fingerprint: string }): Promise<OperatorAdmission> =>
  verifier ? verifier(tx, ctx, actionId, quote) : Promise.resolve({ ok: false, reason: 'operator_unverified', status: 403 });
