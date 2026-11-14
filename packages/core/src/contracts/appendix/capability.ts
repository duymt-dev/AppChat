// Capability niêm phong cho trang ký công khai phụ lục (TIP-030b F3 spec 15): bộ chuyển token (public.service.ts) dựng ActionContext nội bộ,
// gắn vào WeakMap riêng của module này một capability đã kiểm token (phụ lục + version + digest + người ký + action + idempotency key) —
// không serialize, client không đặt được. Handler `contract.appendix_public_*` từ chối mọi ctx không có trong WeakMap (gọi /actions, Trợ
// lý, agent — kể cả Owner), rồi kiểm lại token trong transaction. Capability xoá sau mỗi lần gọi.
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';

export type PublicAppendixAction = 'contract.appendix_public_otp' | 'contract.appendix_public_sign' | 'contract.appendix_public_decline';

export interface AppendixCapability {
  action: PublicAppendixAction;
  tokenId: string;
  tokenHash: string;
  appendixId: string;
  appendixVersion: number;
  documentHash: string;
  signerId: string;
  idempotencyKey: string;
  client: { ip: string | null; userAgent: string | null };
}

const SEALED = new WeakMap<ActionContext, AppendixCapability>();

/** Chỉ public.service gọi: ctx do chính nó dựng (object mới mỗi lần), không phải ctx từ HTTP. */
export function seal(ctx: ActionContext, cap: AppendixCapability): void {
  SEALED.set(ctx, Object.freeze({ ...cap, client: Object.freeze({ ...cap.client }) }));
}

export function unseal(ctx: ActionContext): void {
  SEALED.delete(ctx);
}

/** Handler public: ctx phải mang đúng capability của action + phụ lục trong input + idempotency key; không thì 403. */
export function requireCapability(ctx: ActionContext, action: PublicAppendixAction, appendixId: string): AppendixCapability {
  const cap = SEALED.get(ctx);
  if (!cap || cap.action !== action || cap.appendixId !== appendixId || ctx.idempotencyKey !== cap.idempotencyKey || ctx.source !== 'system' || ctx.actor.type !== 'system') {
    throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
  }
  return cap;
}
