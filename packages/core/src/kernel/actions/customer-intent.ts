// Capability "ý định khách" cho quyết định báo giá (TIP-022c §1.7, §2.1): handle NỘI BỘ server-only — runtime agent (ai/sales-behavior)
// niêm phong vào đúng ctx object của một lời gọi tool sau khi biên nhận `ai_sales_intent` đã ghi; domain sales (customer-intent-guard)
// đọc lại BIÊN NHẬN đã lưu trong transaction hiệu ứng. Không có trường serialize / input công khai nào đúc được (WeakMap riêng của module
// này — giống capability action riêng 003c). Sự hiện diện của handle KHÔNG phải bằng chứng: guard luôn kiểm dòng DB + nguồn tin cậy.
import { createHash } from 'node:crypto';
import type { ActionContext } from './action-context';

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
