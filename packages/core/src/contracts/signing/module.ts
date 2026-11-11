// Bộ chuyển token công khai → action chuẩn (TIP-030c §1.1–1.4): token → (workspace qua `tenant_sign_route`, token tenant đã lưu) → ctx hệ
// thống MỚI (không mượn Owner) + capability niêm phong (hợp đồng / người ký / token / request / version) → runSystemAction (verifier đọc lại
// token đã lưu; biên nhận trigger bền theo request — sống lâu hơn TTL idempotency HTTP) → ActionExecutor. `request_id` (UUID) bắt buộc với
// mọi POST; cùng request + khác nội dung → 409. Controller không truyền được actor / workspace / hợp đồng.
import { AppError } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { runSystemAction, type SystemTrigger } from '../../kernel/actions/system';
import { sha256Hex } from '../services/sign-link';
import { sealSigning, unsealSigning, type SigningAction, type SigningCapability } from './capability';
import { signInvalid } from './read';

export const PARENT_SIGN_ACTOR = 'contract.public_sign';
export const PUBLIC_SIGN_ACTIONS: readonly SigningAction[] = ['contract.public_open', 'contract.public_otp', 'contract.public_decline', 'contract.public_sign', 'contract.sign_attempt_prepare', 'contract.sign_attempt_stage'];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** request_id của client → tham chiếu theo miền (token + thao tác) — không lưu id thô, không trùng giữa token / thao tác. */
export function requestRef(scope: string, op: string, requestId: unknown): string {
  if (typeof requestId !== 'string' || !UUID.test(requestId)) throw new AppError('VALIDATION_FAILED', 422, { request_id: 'invalid' });
  return sha256Hex(`${scope}|${op}|${requestId.toLowerCase()}`);
}

export interface ResolvedToken {
  ws: string;
  db: TenantDb;
  hash: string;
  t: { id: string; contractId: string; signerId: string; expiresAt: Date; usedAt: Date | null };
}

/** Trigger nguồn công khai: token đã lưu (id) + hợp đồng + người ký; milestone = request → biên nhận theo từng yêu cầu. */
export const publicTrigger = (ws: string, action: SigningAction, t: ResolvedToken['t'], ref: string, input: Record<string, unknown>): SystemTrigger => ({
  workspaceId: ws,
  actionId: action,
  sourceKind: 'public_locator',
  sourceRef: t.id,
  targetId: t.contractId,
  generation: t.signerId,
  milestone: ref,
  input,
  actor: PARENT_SIGN_ACTOR,
  idempotencyKey: `sign:${ref}`,
});

/** Verifier 003c: token theo id còn đúng hợp đồng + người ký đã niêm phong (thu hồi / thay → 410). */
export async function verifyParentPublic(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const tok = await db.contractSignToken.findUnique({ where: { id: t.sourceRef }, select: { contractId: true, signerId: true } });
  if (!tok || tok.contractId !== t.targetId || tok.signerId !== t.generation || t.input.contract_id !== t.targetId) throw signInvalid();
}

/** Gọi một action ký công khai: ctx hệ thống mới + capability hẹp + cổng 003c trên CÙNG object; gỡ niêm phong trong finally. */
export async function runPublicSigning<O>(executor: Pick<ActionExecutor, 'execute'>, tenants: Parameters<typeof runSystemAction>[1], r: ResolvedToken, action: SigningAction, ref: string, input: Record<string, unknown>, cap: Pick<SigningCapability, 'client' | 'contractVersion' | 'secret'> & { party?: 'business' | 'customer' }): Promise<O> {
  const trigger = publicTrigger(r.ws, action, r.t, ref, { contract_id: r.t.contractId, ...(action === 'contract.public_sign' || action === 'contract.sign_attempt_stage' ? {} : { request_ref: ref }), ...input });
  const ctx: ActionContext = {
    workspaceId: r.ws,
    source: 'system',
    actor: { type: 'system', id: PARENT_SIGN_ACTOR },
    // Không mượn quyền người dùng nào: action `self` + capability; mọi ghi kiểm lại token trong transaction.
    authz: { userId: '', isOwner: false, permissions: new Set(), scope: {} as never, teamIds: [] },
    idempotencyKey: trigger.idempotencyKey!,
  };
  sealSigning(ctx, {
    action,
    workspaceId: r.ws,
    contractId: r.t.contractId,
    signerId: r.t.signerId,
    party: cap.party ?? 'customer',
    tokenId: r.t.id,
    tokenHash: r.hash,
    actorUserId: null,
    requestRef: ref,
    contractVersion: cap.contractVersion,
    idempotencyKey: ctx.idempotencyKey!,
    client: cap.client,
    ...(cap.secret ? { secret: cap.secret } : {}),
  });
  try {
    const out = await runSystemAction<O>(executor, tenants, trigger, ctx);
    return (out.data as { result: O }).result;
  } finally {
    unsealSigning(ctx);
  }
}
