// Nhận lượt đề xuất theo bản ghi (TIP-023g §3.6, §4.1): binding `record_proposal` khoá (user_id, request_id) — BỀN trước lời gọi model,
// gắn run id cấp sẵn. Cùng khoá + input khác → 409; cùng khoá → trả dòng cũ (không gọi model lần hai). Mỗi hàm là một transaction ngắn,
// không giữ qua model.
import { createHash } from 'node:crypto';
import { AppError, type RecordIntentInput } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';

export const PROPOSAL_SCHEMA_VERSION = 1;
export const PROPOSAL_LEASE_MS = 120_000;

export type ProposalPhase = 'awaiting_generation' | 'validating' | 'validated' | 'invalidated' | 'failed';
export const OPEN_PHASES: readonly ProposalPhase[] = ['awaiting_generation', 'validating'];

export interface ProposalBinding {
  id: string;
  userId: string;
  requestId: string;
  runId: string;
  entity: string;
  entityId: string;
  intent: string;
  sourceVersion: number | null;
  inputDigest: string;
  phase: ProposalPhase;
  validationGeneration: number;
  leaseUntil: Date;
  privateGeneration: string | null;
  publishedResult: unknown;
  safeReason: string | null;
}

type Tx = Pick<TenantTx, 'recordProposal'>;
const SELECT = {
  id: true, userId: true, requestId: true, runId: true, entity: true, entityId: true, intent: true, sourceVersion: true, inputDigest: true, phase: true,
  validationGeneration: true, leaseUntil: true, privateGeneration: true, publishedResult: true, safeReason: true,
} as const;

export const proposalDigest = (r: Pick<RecordIntentInput, 'entity' | 'entity_id' | 'intent' | 'user_task'>): string =>
  createHash('sha256').update(JSON.stringify([r.entity, r.entity_id.toLowerCase(), r.intent, (r.user_task ?? '').normalize('NFC').trim()])).digest('hex');

export async function findProposal(tx: Tx, userId: string, requestId: string): Promise<ProposalBinding | null> {
  return (await tx.recordProposal.findUnique({ where: { userId_requestId: { userId, requestId } }, select: SELECT })) as ProposalBinding | null;
}

/** Cấp binding (`awaiting_generation`) với run id cấp sẵn. Có rồi: digest khác → 409, giống → trả dòng cũ. */
export async function allocateProposal(
  tx: Tx, q: { userId: string; intent: RecordIntentInput; runId: string; sourceVersion: number | null }, now: Date,
): Promise<{ binding: ProposalBinding; created: boolean }> {
  const digest = proposalDigest(q.intent);
  const same = (b: ProposalBinding) => {
    if (b.inputDigest !== digest) throw new AppError('CONFLICT', 409, { request_id: 'mismatch' });
    return { binding: b, created: false };
  };
  const prior = await findProposal(tx, q.userId, q.intent.request_id);
  if (prior) return same(prior);
  try {
    const b = await tx.recordProposal.create({
      data: {
        id: uuidv7(now.getTime()), userId: q.userId, requestId: q.intent.request_id, runId: q.runId, entity: q.intent.entity, entityId: q.intent.entity_id,
        intent: q.intent.intent, sourceVersion: q.sourceVersion, schemaVersion: PROPOSAL_SCHEMA_VERSION, inputDigest: digest, leaseUntil: new Date(now.getTime() + PROPOSAL_LEASE_MS),
      },
      select: SELECT,
    });
    return { binding: b as ProposalBinding, created: true };
  } catch (e) {
    if ((e as { code?: string })?.code !== 'P2002') throw e;
    const won = await findProposal(tx, q.userId, q.intent.request_id);
    if (!won) throw e;
    return same(won);
  }
}
