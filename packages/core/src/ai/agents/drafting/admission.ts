// Nhận lần soạn (TIP-021b §1.2, §3.6): binding `agent_draft_publication` khoá (actor_id, sha256(action + request_id)) — BỀN trước mọi
// lời gọi model / embed. Cùng khoá + mô tả khác → 409; cùng khoá đang chạy (còn lease) → 409 in_progress kèm operation; đã xong → trả
// trạng thái cũ (không gọi model lần hai). Actor / root / run do server cấp — input người dùng không chọn được. Không transaction giữ qua
// discovery / model: mỗi hàm ở đây là một transaction ngắn.
import { createHash } from 'node:crypto';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { actorScopeOf } from '../../skills/utility-operations';
import { normalizeDescription } from './discovery';

export const DRAFT_ACTION = 'agent.draft_from_description';
/** Lease mỗi pha: quá hạn mà chưa kết thúc → lượt gửi lại cùng khoá được khôi phục (kiểm lại chữ đã lưu, không gọi model). */
export const DRAFT_LEASE_MS = 120_000;

export type DraftPhase = 'awaiting_generation' | 'awaiting_validation' | 'published' | 'rejected' | 'invalidated';

export interface DraftBinding {
  id: string;
  runId: string | null;
  phase: DraftPhase;
  inputDigest: string;
  candidates: unknown;
  discovery: unknown;
  candidateFingerprint: string;
  validationGeneration: number;
  leaseUntil: Date;
  protectedResult: string | null;
  publishedResult: unknown;
  safeReason: string | null;
}

export interface DraftIdentity {
  actorId: string;
  requestKeyHash: string;
  inputDigest: string;
  schemaVersion: number;
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

export function draftIdentity(actor: { type: string; id: string }, onBehalfOfUserId: string | null | undefined, requestId: string, description: string, schemaVersion: number): DraftIdentity {
  return { actorId: actorScopeOf(actor, onBehalfOfUserId), requestKeyHash: sha(`${DRAFT_ACTION}\u0000${requestId.toLowerCase()}`), inputDigest: sha(normalizeDescription(description)), schemaVersion };
}

const SELECT = { id: true, runId: true, phase: true, inputDigest: true, candidates: true, discovery: true, candidateFingerprint: true, validationGeneration: true, leaseUntil: true, protectedResult: true, publishedResult: true, safeReason: true } as const;
const row = (r: DraftBinding): DraftBinding => ({ ...r, phase: r.phase as DraftPhase });

export async function findDraft(tx: Pick<TenantTx, 'agentDraftPublication'>, id: DraftIdentity): Promise<DraftBinding | null> {
  const r = await tx.agentDraftPublication.findUnique({ where: { actorId_requestKeyHash: { actorId: id.actorId, requestKeyHash: id.requestKeyHash } }, select: SELECT });
  if (!r) return null;
  if (r.inputDigest !== id.inputDigest) throw new AppError('CONFLICT', 409, { request_id: 'description_changed' }, 'request_id đã dùng cho mô tả khác — tạo request_id mới');
  return row(r as DraftBinding);
}

/**
 * Cấp binding mới (`awaiting_generation`) với run id cấp sẵn (null = soạn tất định không runtime). Thua đua unique → đọc dòng thắng
 * (cùng mô tả) hoặc 409 (mô tả khác). Trả `{ created }` để người gọi biết mình là người chạy.
 */
export async function allocateDraft(tx: Pick<TenantTx, 'agentDraftPublication'>, id: DraftIdentity, runId: string | null, now: Date): Promise<{ binding: DraftBinding; created: boolean }> {
  const prior = await findDraft(tx, id);
  if (prior) return { binding: prior, created: false };
  try {
    const r = await tx.agentDraftPublication.create({
      data: {
        id: uuidv7(now.getTime()), runId, actorId: id.actorId, requestKeyHash: id.requestKeyHash, inputDigest: id.inputDigest, schemaVersion: id.schemaVersion,
        candidateFingerprint: '', candidates: [], discovery: {}, leaseUntil: new Date(now.getTime() + DRAFT_LEASE_MS),
      },
      select: SELECT,
    });
    return { binding: row(r as DraftBinding), created: true };
  } catch (e) {
    if ((e as { code?: string })?.code !== 'P2002') throw e;
    const won = await findDraft(tx, id);
    if (!won) throw e;
    return { binding: won, created: false };
  }
}

/** Lượt gửi lại khi binding còn đang chạy trong lease → 409 rõ ràng (không chạy song song lần hai, không bịa kết quả). */
export function assertNotRunning(b: DraftBinding, now: Date): void {
  const live = (b.phase === 'awaiting_generation' || b.phase === 'awaiting_validation') && b.leaseUntil.getTime() > now.getTime();
  if (live) throw new AppError('CONFLICT', 409, { request_id: 'in_progress', operation_id: b.id }, 'Lần soạn này đang chạy');
}
