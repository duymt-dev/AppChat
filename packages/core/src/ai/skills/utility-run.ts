// Vòng đời một lần gọi kỹ năng tiện ích (TIP-019c §3.1–3.2, lát 1): `prepare` — kiểm quyền + giải nguồn + giới hạn kích thước trong
// transaction ĐỌC ngắn, rồi gọi model NGOÀI transaction qua run `consult` (AiRunner + CreditMeter, cha tin cậy 019b — cùng run con khi
// action phát lại, không gọi model lần hai), generator KHÔNG tool; kiểm JSON + bằng chứng ở ứng dụng. `execute` — đọc lại nguồn theo quyền
// HIỆN TẠI: mất quyền → 403 / 404 như thường, nội dung / binding đổi trong lúc model chạy → 409 source_changed (usage đã phát sinh vẫn
// tính theo 019b). Lát sau: bảng utility_operation + công bố sau kiểm (ẩn đầu ra thô khỏi đọc run chung), GET kết quả, sửa một lần.
import type { TenantDb } from '@appchat/db';
import { AppError, UTILITY_SCHEMA_VERSION, UtilityOutputError, parseModelJson, type AuthzContext, type UtilityEnvelope } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { runOnce } from '../agents/agent.runtime';
import type { AiRunner } from '../runs/runner';
import type { TrustedParent } from '../runs/run-lineage';
import type { ResolvedSources, SourceChunk } from './utility-sources';
import { sourceBlock } from './utility-prompts';

export interface UtilityJob {
  actionId: string;
  ws: string;
  userId: string | null;
  locale: 'vi' | 'en';
  system: string;
  /** Kiểm đầu ra model → đề xuất đã kiểm (ném UtilityOutputError khi sai). */
  validate: (raw: unknown, chunks: SourceChunk[]) => unknown;
  input: Record<string, unknown>;
  parent: TrustedParent | null;
  conversationId?: string | null;
}
export interface PreparedUtility {
  envelope: UtilityEnvelope;
  digest: string;
}

/** Người dùng thật đứng sau lời gọi (UI trực tiếp / người ra lệnh của agent). */
export const utilityUser = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

export async function readSources(db: TenantDb, resolve: (tx: TenantTx) => Promise<ResolvedSources>): Promise<ResolvedSources> {
  return db.$transaction((tx) => resolve(tx as TenantTx));
}

export async function runUtility(db: TenantDb, runner: AiRunner, now: () => Date, src: ResolvedSources, j: UtilityJob): Promise<PreparedUtility> {
  const r = await runOnce(db, runner, now, j.ws, {
    run: { kind: 'consult', title: j.actionId, tier: 'standard', initiatedByUserId: j.userId, conversationId: j.conversationId ?? null, input: j.input },
    system: j.system,
    prompt: sourceBlock(src.chunks),
    source: 'assistant',
    parent: j.parent,
  });
  if (r.status !== 'completed') {
    const credit = r.error?.code === 'CREDIT_EXHAUSTED';
    if (r.status === 'cancelled') return { digest: src.digest, envelope: { utility_run_id: r.runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'cancelled' } };
    throw new AppError(credit ? 'CREDIT_EXHAUSTED' : 'INTERNAL', credit ? 402 : 502, { run_id: r.runId }, r.error?.message);
  }
  try {
    const proposal = j.validate(parseModelJson(r.text), src.chunks);
    return { digest: src.digest, envelope: { utility_run_id: r.runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'completed', proposal } };
  } catch (e) {
    if (!(e instanceof UtilityOutputError)) throw e;
    // Đầu ra không qua kiểm → thất bại có kiểu, KHÔNG coi chữ thô là kết quả; không vòng sửa không tính phí.
    return { digest: src.digest, envelope: { utility_run_id: r.runId, schema_version: UTILITY_SCHEMA_VERSION, state: 'failed', reason: e.code } };
  }
}

/** Trước khi trả kết quả: giải lại nguồn theo quyền hiện tại trong tx của action; khác băm → 409 (không trả kết quả cũ). */
export async function recheck(tx: TenantTx, authz: AuthzContext, prepared: PreparedUtility, resolve: (tx: TenantTx, a: AuthzContext) => Promise<ResolvedSources>): Promise<UtilityEnvelope> {
  if (prepared.envelope.state !== 'completed') return prepared.envelope;
  const now = await resolve(tx, authz);
  if (now.digest !== prepared.digest) throw new AppError('CONFLICT', 409, { source: 'source_changed', utility_run_id: prepared.envelope.utility_run_id });
  return prepared.envelope;
}
