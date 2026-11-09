// Vòng đời một lần gọi kỹ năng tiện ích (TIP-019c §3.1–3.6): `prepare` — kiểm quyền + giải nguồn trong transaction ĐỌC ngắn, cấp
// `utility_operation` BỀN trước khi gọi model (khoá actor_scope+action_id+invocation_key — cùng khoá đang generating thì không gọi lại),
// gọi model NGOÀI transaction qua run `consult` (AiRunner + CreditMeter, cha tin cậy 019b), generator KHÔNG tool. Đầu ra thô lưu riêng
// (`generated_payload`) rồi mới kiểm; sai một lần được sửa đúng một lượt (cùng operation, 019b tính thêm một lần gọi); sai sau sửa →
// `failed`, không công khai chữ thô. Đúng → `validated_result` — đây mới là điều `execute` / GET kết quả được đọc. `execute` đọc lại
// nguồn theo quyền HIỆN TẠI trước khi trả: mất quyền → 403/404 như thường; nội dung đổi → 409 source_changed + operation `invalidated`.
import type { TenantDb } from '@appchat/db';
import { AppError, UTILITY_SCHEMA_VERSION, UtilityOutputError, parseModelJson, type AuthzContext, type UtilityEnvelope } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { runOnce } from '../agents/agent.runtime';
import type { AiRunner } from '../runs/runner';
import type { TrustedParent } from '../runs/run-lineage';
import type { ResolvedSources, SourceChunk } from './utility-sources';
import { sourceBlock } from './utility-prompts';
import { actorScopeOf, allocateOperation, beginRepair, failOperation, inputHashOf, invalidateOperation, operationByRun, publishValidated, recordGenerated, type OperationRow } from './utility-operations';

export interface UtilityJob {
  actionId: string;
  ws: string;
  actor: { type: string; id: string };
  onBehalfOfUserId: string | null;
  userId: string | null;
  locale: 'vi' | 'en';
  system: string;
  /** Kiểm đầu ra model → đề xuất đã kiểm (ném UtilityOutputError khi sai). */
  validate: (raw: unknown, chunks: SourceChunk[]) => unknown;
  input: Record<string, unknown>;
  /** Tham số kiểm (max_bullets / taxonomy / fields…) — lưu cùng `source_bindings` để lát khôi phục dựng lại đúng validator, không gọi
   * lại model. Không chứa chữ nguồn / chữ người gọi (chỉ cấu hình, giống `input` của action không chứa nội dung nguồn). */
  validateParams?: Record<string, unknown>;
  /** UI gọi trực tiếp: Idempotency-Key của request. Gọi qua tool: dùng khoá con 019b (ổn định qua phát lại) thay cho field này. */
  idempotencyKey?: string;
  parent: TrustedParent | null;
  conversationId?: string | null;
  runEpoch: number;
}
export type PreparedUtility = { envelope: UtilityEnvelope; digest: string; operationId: string };

/** Người dùng thật đứng sau lời gọi (UI trực tiếp / người ra lệnh của agent). */
export const utilityUser = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

export async function readSources(db: TenantDb, resolve: (tx: TenantTx) => Promise<ResolvedSources>): Promise<ResolvedSources> {
  return db.$transaction((tx) => resolve(tx as TenantTx));
}

const envelopeOf = (runId: string, op: OperationRow): UtilityEnvelope => {
  if (op.phase === 'validated') return { utility_run_id: runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'completed', proposal: op.validatedResult };
  if (op.phase === 'failed') return { utility_run_id: runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'failed', reason: op.failureReason ?? undefined };
  if (op.phase === 'invalidated') return { utility_run_id: runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'invalidated' };
  if (op.phase === 'cancelled') return { utility_run_id: runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'cancelled' };
  if (op.phase === 'unknown') return { utility_run_id: runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'unknown' };
  return { utility_run_id: runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'pending' };
};

/**
 * Gọi model một lượt rồi kiểm; không ném cho lỗi schema (trả null để `failOperation`), ném cho lỗi hạ tầng. `runId` riêng mỗi lượt gọi
 * (gốc + lượt sửa là hai `ai_run` khác nhau, lượt sửa là CON của lượt gốc — cùng root/ngân sách 019b); `operationId` chung một dòng
 * `utility_operation` (chỉ lượt GỐC khớp `utility_operation.run_id` — handle trả cho người gọi luôn là run gốc, ổn định qua sửa).
 */
async function generateAndValidate(
  db: TenantDb, runner: AiRunner, now: () => Date, runId: string, operationId: string, parent: TrustedParent | null, src: ResolvedSources, j: UtilityJob, system: string,
): Promise<{ proposal: unknown; reason?: string } | { proposal: null; reason: string }> {
  const r = await runOnce(db, runner, now, j.ws, {
    run: { id: runId, kind: 'consult', title: j.actionId, tier: 'standard', initiatedByUserId: j.userId, conversationId: j.conversationId ?? null, input: j.input },
    system,
    prompt: sourceBlock(src.chunks),
    source: 'assistant',
    parent,
  });
  if (r.status !== 'completed') {
    const credit = r.error?.code === 'CREDIT_EXHAUSTED';
    if (r.status === 'cancelled') return { proposal: null, reason: 'cancelled' };
    throw new AppError(credit ? 'CREDIT_EXHAUSTED' : 'INTERNAL', credit ? 402 : 502, { run_id: r.runId }, r.error?.message);
  }
  const saved = await db.$transaction((tx) => recordGenerated(tx as unknown as TenantTx, operationId, r.text));
  if (!saved) return { proposal: null, reason: 'race' }; // CAS mất — tiến trình khác đã chuyển pha cho cùng operation (gọi lại cùng khoá).
  try {
    return { proposal: j.validate(parseModelJson(r.text), src.chunks) };
  } catch (e) {
    if (!(e instanceof UtilityOutputError)) throw e;
    return { proposal: null, reason: e.code };
  }
}

export async function runUtility(db: TenantDb, runner: AiRunner, now: () => Date, src: ResolvedSources, j: UtilityJob): Promise<PreparedUtility> {
  const actorScope = actorScopeOf(j.actor, j.onBehalfOfUserId);
  const invocationKey = j.parent ? j.parent.childKey : j.idempotencyKey ?? `auto:${inputHashOf({ actionId: j.actionId, input: j.input, refs: src.refs })}`;
  const inputHash = inputHashOf({ input: j.input, refs: src.refs, digest: src.digest });
  const runId = uuidv7(now().getTime());
  const op = await db.$transaction((tx) =>
    allocateOperation(tx as unknown as TenantTx, { actorScope, actionId: j.actionId, invocationKey, schemaVersion: UTILITY_SCHEMA_VERSION, inputHash, sourceBindings: { refs: src.refs, params: j.validateParams ?? {} }, runEpoch: j.runEpoch }, () => runId),
  );
  // Khoá đã có kết quả (xong / sai / vô hiệu / huỷ) — trả thẳng, không gọi model lần hai.
  if (op.phase !== 'generating' && op.phase !== 'validating') return { envelope: envelopeOf(op.runId, op), digest: src.digest, operationId: op.id };

  const unknownEnvelope = (runId: string) => ({ utility_run_id: runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'unknown' as const });
  const readBack = async () => {
    const now2 = await db.$transaction((tx) => operationByRun(tx as unknown as TenantTx, op.runId));
    return { envelope: now2 ? envelopeOf(op.runId, now2) : unknownEnvelope(op.runId), digest: src.digest, operationId: op.id };
  };

  const first = await generateAndValidate(db, runner, now, op.runId, op.id, j.parent, src, j, j.system);
  // Tiến trình khác đã ghi chữ thô / chuyển pha cho cùng operation (phát lại cùng khoá) — đọc lại trạng thái thật, không tự quyết.
  if (first.reason === 'race') return readBack();

  let final = first;
  let repaired = false;
  if (first.proposal === null && first.reason !== 'cancelled') {
    // Một lần sửa duy nhất: lượt sửa là CON của lượt gốc (cùng operation/root ngân sách 019b) — `beginRepair` CAS đảm bảo chỉ một lần.
    const repairing = await db.$transaction((tx) => beginRepair(tx as unknown as TenantTx, op.id));
    if (!repairing) return readBack(); // operation đã được sửa / đóng ở tiến trình khác.
    repaired = true;
    final = await generateAndValidate(db, runner, now, uuidv7(now().getTime()), op.id, { parentRunId: op.runId, childKey: `repair:${op.id}` }, src, j, `${j.system}\n\n# SỬA LẠI\nKết quả trước sai: ${first.reason}. Trả đúng khuôn JSON, không lặp lại lỗi này.`);
    if (final.reason === 'race') return readBack();
  }
  const closed = await db.$transaction(async (tx) => {
    const t = tx as unknown as TenantTx;
    if (final.proposal !== null) await publishValidated(t, op.id, final.proposal);
    else await failOperation(t, op.id, final.reason ?? 'unknown', repaired);
    return operationByRun(t, op.runId);
  });
  return { envelope: closed ? envelopeOf(op.runId, closed) : unknownEnvelope(op.runId), digest: src.digest, operationId: op.id };
}

/** Trước khi trả kết quả: giải lại nguồn theo quyền hiện tại; khác băm → vô hiệu operation + 409 (không trả kết quả cũ). */
export async function recheck(tx: TenantTx, authz: AuthzContext, prepared: PreparedUtility, resolve: (tx: TenantTx, a: AuthzContext) => Promise<ResolvedSources>): Promise<UtilityEnvelope> {
  if (prepared.envelope.state !== 'completed') return prepared.envelope;
  const now = await resolve(tx, authz);
  if (now.digest !== prepared.digest) {
    await invalidateOperation(tx, prepared.operationId);
    throw new AppError('CONFLICT', 409, { source: 'source_changed', utility_run_id: prepared.envelope.utility_run_id });
  }
  return prepared.envelope;
}
