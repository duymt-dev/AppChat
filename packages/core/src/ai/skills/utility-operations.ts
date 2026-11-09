// Fence công bố kỹ năng tiện ích (TIP-019c §3.5): một dòng `utility_operation` / lần gọi, khoá (actor_scope, action_id, invocation_key)
// chặn gọi model lần hai cho cùng lần gọi. `actor_scope` là người / agent + người ra lệnh đứng sau (không phải tenant client).
// `invocation_key`: UI độc lập dùng Idempotency-Key của request; gọi qua tool dùng khoá con 019b (cha + bước + action) — ổn định qua
// phát lại cùng lời gọi. Cùng khoá, input khác hash → 409 trước khi gọi model; cùng khoá đang generating → trả operation đang có (không
// gọi lại). Operation cấp PHẢI bền trước khi gọi model (không transaction giữ qua model).
import { createHash } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

export type UtilityPhase = 'generating' | 'validating' | 'validated' | 'invalidated' | 'failed' | 'unknown' | 'cancelled';
export const TERMINAL_PHASES: readonly UtilityPhase[] = ['validated', 'invalidated', 'failed', 'cancelled'];

export interface OperationIdentity {
  actorScope: string;
  actionId: string;
  invocationKey: string;
  schemaVersion: number;
  inputHash: string;
  sourceBindings: Record<string, unknown>;
  runEpoch: number;
}
export interface OperationRow {
  id: string;
  runId: string;
  phase: UtilityPhase;
  generatedPayload: string | null;
  validatedResult: unknown;
  failureReason: string | null;
  repaired: boolean;
  inputHash: string;
  runEpoch: number;
}

/** `actor_scope`: người thật đứng sau lời gọi — agent trực kênh thêm người ra lệnh (commander) khi có, không bao giờ là workspace id. */
export const actorScopeOf = (actor: { type: string; id: string }, onBehalfOfUserId?: string | null): string =>
  onBehalfOfUserId ? `${actor.type}:${actor.id}:${onBehalfOfUserId}` : `${actor.type}:${actor.id}`;

export const inputHashOf = (v: unknown): string => createHash('sha256').update(JSON.stringify(v)).digest('hex');

const row = (r: {
  id: string; runId: string; phase: string; generatedPayload: string | null; validatedResult: unknown; failureReason: string | null; repaired: boolean; inputHash: string; runEpoch: number;
}): OperationRow => ({ id: r.id, runId: r.runId, phase: r.phase as UtilityPhase, generatedPayload: r.generatedPayload, validatedResult: r.validatedResult, failureReason: r.failureReason, repaired: r.repaired, inputHash: r.inputHash, runEpoch: r.runEpoch });

/**
 * Cấp operation cho lần gọi này — bền TRƯỚC khi gọi model. Đã có cùng khoá: hash khác → 409 (không gọi model); hash giống → trả dòng cũ
 * (đang generating thì gọi lại không tạo dòng mới, không gọi model lần hai — người gọi dùng `runId` của dòng cũ).
 */
export async function allocateOperation(tx: TenantTx, id: OperationIdentity, newRunId: () => string): Promise<OperationRow> {
  const existing = await tx.utilityOperation.findUnique({ where: { actorScope_actionId_invocationKey: { actorScope: id.actorScope, actionId: id.actionId, invocationKey: id.invocationKey } } });
  if (existing) {
    if (existing.inputHash !== id.inputHash) throw new AppError('CONFLICT', 409, { invocation_key: 'mismatch' });
    return row(existing);
  }
  const created = await tx.utilityOperation.create({
    data: {
      id: uuidv7(), runId: newRunId(), actionId: id.actionId, actorScope: id.actorScope, invocationKey: id.invocationKey,
      schemaVersion: id.schemaVersion, inputHash: id.inputHash, sourceBindings: id.sourceBindings as object, runEpoch: id.runEpoch, phase: 'generating',
    },
  });
  return row(created);
}

/** Model đã trả JSON thô — lưu riêng (không công khai) rồi chuyển sang `validating`. Chỉ áp khi còn `generating` (CAS theo id). */
export async function recordGenerated(tx: TenantTx, operationId: string, payload: string): Promise<boolean> {
  const r = await tx.utilityOperation.updateMany({ where: { id: operationId, phase: 'generating' }, data: { phase: 'validating', generatedPayload: payload } });
  return r.count > 0;
}

/** Đầu ra sai → cho MỘT lượt sửa duy nhất: `validating` → `generating` lại (CAS theo `repaired=false`, mỗi operation chỉ sửa một lần). */
export async function beginRepair(tx: TenantTx, operationId: string): Promise<boolean> {
  const r = await tx.utilityOperation.updateMany({ where: { id: operationId, phase: 'validating', repaired: false }, data: { phase: 'generating', repaired: true } });
  return r.count > 0;
}

/** Kiểm xong, đúng → công khai `validated_result`; huỷ / mất quyền trong lúc này thắng (CAS theo phase hiện có, không đè `cancelled`/`invalidated`). */
export async function publishValidated(tx: TenantTx, operationId: string, result: unknown): Promise<boolean> {
  const r = await tx.utilityOperation.updateMany({ where: { id: operationId, phase: 'validating' }, data: { phase: 'validated', validatedResult: result as object } });
  return r.count > 0;
}

/** Model trả sai sau tối đa một lần sửa → `failed` có lý do, không công khai chữ thô. Huỷ run (không phải lỗi schema) → `cancelled`. */
export async function failOperation(tx: TenantTx, operationId: string, reason: string, repaired: boolean): Promise<void> {
  await tx.utilityOperation.updateMany({ where: { id: operationId, phase: { in: ['generating', 'validating'] } }, data: { phase: reason === 'cancelled' ? 'cancelled' : 'failed', failureReason: reason, repaired } });
}

/** Nguồn đổi trước khi công bố (409 source_changed) hoặc mất quyền (403/404 lan ra ngoài) → vô hiệu, không trả kết quả cũ. */
export async function invalidateOperation(tx: TenantTx, operationId: string): Promise<void> {
  await tx.utilityOperation.updateMany({ where: { id: operationId, phase: { in: ['generating', 'validating'] } }, data: { phase: 'invalidated' } });
}

export async function operationByRun(tx: Pick<TenantTx, 'utilityOperation'>, runId: string): Promise<OperationRow | null> {
  const r = await tx.utilityOperation.findUnique({ where: { runId } });
  return r ? row(r) : null;
}
