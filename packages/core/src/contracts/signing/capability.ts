// Capability niêm phong cho ký hợp đồng cha (TIP-030c §1.4): bộ chuyển token công khai / pipeline ký dựng ActionContext MỚI, gắn vào WeakMap
// riêng của module này capability đã kiểm (workspace + token id / hash + hợp đồng + người ký + bên + action + request / attempt + version tài
// liệu). Không serialize, client không đặt được; ctx giống hệt hình dạng (source system, Owner, Trợ lý) mà không phải object đã niêm phong → 403.
// Handler gọi `requireSigning` cả ở execute lẫn prepare rồi kiểm lại nguồn trong transaction. Gỡ sau mỗi lần gọi.
import { AppError } from '@appchat/shared';
import type { ActionContext } from '../../kernel/actions/action-context';

export type SigningAction = 'contract.public_open' | 'contract.public_otp' | 'contract.public_decline' | 'contract.public_sign' | 'contract.sign_attempt_prepare' | 'contract.sign_attempt_stage';

export interface SigningCapability {
  action: SigningAction;
  workspaceId: string;
  contractId: string;
  signerId: string;
  party: 'business' | 'customer';
  /** Token công khai (bên khách) — null với Owner. */
  tokenId: string | null;
  tokenHash: string | null;
  /** Người dùng hiện tại (Owner / người được uỷ quyền) — null với khách. */
  actorUserId: string | null;
  /** request_ref (sha256 miền + request_id) hoặc attempt id. */
  requestRef: string;
  contractVersion: number;
  idempotencyKey: string;
  client: { ip: string | null; userAgent: string | null };
  /** Phong bì bí mật tạm (OTP + chữ ký) — chỉ trong bộ nhớ tiến trình, không vào input / log / kết quả. */
  secret?: { otp: string; signaturePng: string };
}

const SEALED = new WeakMap<ActionContext, Readonly<SigningCapability>>();

/** Chỉ bộ chuyển trong `contracts/signing` gọi, trên ctx object mới do chính nó dựng. */
export function sealSigning(ctx: ActionContext, cap: SigningCapability): void {
  if (ctx.workspaceId !== cap.workspaceId || ctx.idempotencyKey !== cap.idempotencyKey) throw new Error('sealSigning: ctx không khớp capability');
  SEALED.set(ctx, Object.freeze({ ...cap, client: Object.freeze({ ...cap.client }), ...(cap.secret ? { secret: Object.freeze({ ...cap.secret }) } : {}) }));
}

export function unsealSigning(ctx: ActionContext): void {
  SEALED.delete(ctx);
}

/** Handler: ctx phải mang đúng capability của action + hợp đồng trong input + idempotency key; không thì 403. */
export function requireSigning(ctx: ActionContext, action: SigningAction, contractId: string): Readonly<SigningCapability> {
  const cap = SEALED.get(ctx);
  if (!cap || cap.action !== action || cap.contractId !== contractId || cap.workspaceId !== ctx.workspaceId || ctx.idempotencyKey !== cap.idempotencyKey || ctx.source !== 'system' || ctx.actor.type !== 'system') {
    throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
  }
  return cap;
}
