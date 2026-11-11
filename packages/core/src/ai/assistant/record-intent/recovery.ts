// Luồng đề xuất theo bản ghi + khôi phục (TIP-023g §3.6, §4.1): nhận binding BỀN → run 019b → sinh schema không tool → lưu chữ riêng →
// kiểm theo quyền / nguồn hiện hành → CAS công bố. Gửi lại cùng request_id: đã kết thúc → trả trạng thái cũ; đang chạy trong lease → 409;
// `validating` quá lease (tiến trình chết sau khi model trả) → kiểm lại chữ đã lưu dưới fence, KHÔNG gọi model lần hai; `awaiting_generation`
// quá lease → usage không rõ, không gửi lại provider. Quét nền: cùng luật, chữ bỏ dở quá 24 giờ thì vô hiệu.
import { AppError, type RecordIntentInput, type RecordProposalDto } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { AssistantTurnCtx } from '../types';
import { allocateProposal, findProposal, OPEN_PHASES, type ProposalBinding } from './admission';
import { resolveRecord } from './context';
import { catalogCandidates, createProposalRun, generateProposal, proposalPrompt, type ProposeDeps } from './proposal';
import { claimValidation, failProposal, invalidateProposal, publishProposal, recordGeneration } from './publication';
import { proposalDto, validateProposal } from './projection';

type Tx = Pick<TenantTx, 'recordProposal'>;
const reread = async (d: ProposeDeps, id: string) => (await d.db.recordProposal.findUniqueOrThrow({ where: { id } })) as unknown as ProposalBinding;

/** Kiểm chữ đã lưu (lần đầu hoặc khôi phục) rồi công bố đúng thế hệ. Nguồn / sản phẩm mất → vô hiệu; khuôn sai → thất bại. */
async function finalize(d: ProposeDeps, t: AssistantTurnCtx, b: ProposalBinding, generation: number, text: string): Promise<ProposalBinding> {
  const v = await validateProposal(d.executor, t, b, text);
  await d.db.$transaction(async (tx) => {
    if (v.ok) await publishProposal(tx as Tx, b.id, generation, v.result);
    else if (v.reason === 'malformed_output') await failProposal(tx as Tx, b.id, v.reason);
    else await invalidateProposal(tx as Tx, b.id, v.reason);
  });
  return reread(d, b.id);
}

/** Gửi lại cùng request_id. */
async function resume(d: ProposeDeps, t: AssistantTurnCtx, b: ProposalBinding): Promise<RecordProposalDto> {
  const now = d.now();
  if (!OPEN_PHASES.includes(b.phase)) return proposalDto(b);
  if (b.leaseUntil.getTime() > now.getTime()) throw new AppError('CONFLICT', 409, { request_id: 'in_progress', proposal_id: b.id });
  if (b.phase === 'validating' && b.privateGeneration) {
    const claimed = await d.db.$transaction((tx) => claimValidation(tx as Tx, b.id, b.validationGeneration, now));
    if (!claimed) return proposalDto(await reread(d, b.id));
    return proposalDto(await finalize(d, t, b, b.validationGeneration, b.privateGeneration));
  }
  await d.db.$transaction((tx) => failProposal(tx as Tx, b.id, 'USAGE_UNKNOWN'));
  return proposalDto(await reread(d, b.id));
}

/** Đề xuất combo / chiến dịch cho một sản phẩm — quyền nguồn kiểm TRƯỚC model (404 / 403), không ghi nghiệp vụ. `t.runId` = run id cấp sẵn của binding. */
export async function proposeForRecord(d: ProposeDeps, t: AssistantTurnCtx, ri: RecordIntentInput): Promise<RecordProposalDto> {
  const prior = await findProposal(d.db, t.userId, ri.request_id);
  if (prior) {
    const again = await allocateProposal(d.db, { userId: t.userId, intent: ri, runId: prior.runId, sourceVersion: prior.sourceVersion }, d.now());
    return resume(d, t, again.binding);
  }
  const source = await resolveRecord(d, t, ri.entity, ri.entity_id);
  if (ri.displayed_version !== undefined && source.version !== null && source.version !== ri.displayed_version) throw new AppError('CONFLICT', 409, { record: 'version_changed' });
  const candidates = ri.intent === 'product_combo' ? await catalogCandidates(d.executor, t, ri.entity_id) : [];
  const ids = [...new Set([ri.entity_id, ...candidates.map((c) => c.product_id)])];
  const { binding, created } = await d.db.$transaction((tx) => allocateProposal(tx as Tx, { userId: t.userId, intent: ri, runId: t.runId, sourceVersion: source.version }, d.now()));
  if (!created) return resume(d, t, binding);
  const run = await createProposalRun(d.db, d.now, { runId: binding.runId, userId: t.userId, intent: ri.intent, entityId: ri.entity_id });
  const g = await generateProposal(d.db, d.runner, d.now, t.ws, run, ri.intent, proposalPrompt(source, candidates, ri.user_task), ids);
  if (g.kind === 'stop') {
    await d.db.$transaction((tx) => (g.code === 'CANCELLED' ? invalidateProposal(tx as Tx, binding.id, 'cancelled') : failProposal(tx as Tx, binding.id, g.code)));
    return proposalDto(await reread(d, binding.id));
  }
  const generation = await d.db.$transaction((tx) => recordGeneration(tx as Tx, binding.id, g.text, d.now()));
  if (generation === null) return proposalDto(await reread(d, binding.id));
  return proposalDto(await finalize(d, t, binding, generation, g.text));
}

/** Đọc lại theo request_id của chính người gọi — chưa công bố thì chỉ trạng thái; đã công bố → kiểm lại nguồn còn đọc được. */
export async function readProposal(d: ProposeDeps, t: AssistantTurnCtx, requestId: string): Promise<RecordProposalDto> {
  const b = await findProposal(d.db, t.userId, requestId);
  if (!b) throw new AppError('NOT_FOUND', 404, { request_id: 'not_found' });
  if (b.phase === 'validated') {
    try {
      // Đọc lại nguồn gắn vào run đã sinh đề xuất (ngữ cảnh action cần run thật cho nhật ký).
      await resolveRecord(d, { ...t, runId: b.runId }, b.entity as RecordIntentInput['entity'], b.entityId);
    } catch (e) {
      if (!(e instanceof AppError) || e.httpStatus >= 500) throw e;
      await d.db.$transaction((tx) => invalidateProposal(tx as Tx, b.id, 'source_unavailable'));
      return proposalDto(await reread(d, b.id));
    }
  }
  return proposalDto(b);
}

// Quét khôi phục ở publication.ts (chỉ phụ thuộc admission) — runtime.providers nạp nó không kéo theo Trợ lý / kênh (tránh vòng import).
export { recoverProposals } from './publication';
