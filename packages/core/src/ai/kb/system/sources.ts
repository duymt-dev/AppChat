// Nguồn trigger + verifier của `kb.system_publish` (TIP-003c §1.3, §4.6): nguồn `accepted_operation` = lần nạp đã nhận (job
// `kb-<nguồn>-<lần nạp>`), thế hệ = ingest_seq. Verifier đọc nguồn đã lưu: học lại (seq tăng) → 409; `publish_unlearned` chỉ khi
// learn=false, `publish_ready` chỉ khi learn=true. Nguồn đã xoá vẫn qua cổng — handler trả no_effect trong transaction.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { stableTriggerId, type SystemTrigger } from '../../../kernel/actions/system';

export const KB_SYSTEM_ACTOR = 'kb-ingest';
const ACTION = 'kb.system_publish';
export type KbPublishOp = 'publish_ready' | 'publish_failed' | 'publish_unlearned';
const refOf = (sourceId: string, seq: string) => `kb-ingest:${sourceId}:${seq}`;

export function kbPublishTrigger(ws: string, op: KbPublishOp, sourceId: string, seq: number): SystemTrigger {
  const gen = String(seq);
  const ref = refOf(sourceId, gen);
  const t = stableTriggerId('accepted_operation', ref, ACTION, op, sourceId, gen, '');
  return { workspaceId: ws, actionId: ACTION, sourceKind: 'accepted_operation', sourceRef: ref, targetId: sourceId, generation: gen, milestone: '', input: { trigger_id: t, entity_id: sourceId, operation: op }, actor: KB_SYSTEM_ACTOR, idempotencyKey: `system:${t}` };
}

export async function verifyKbPublish(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string; operation?: string };
  const op = String(i.operation) as KbPublishOp;
  if (t.sourceKind !== 'accepted_operation' || t.sourceRef !== refOf(t.targetId, t.generation) || i.entity_id !== t.targetId) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  if (i.trigger_id !== stableTriggerId(t.sourceKind, t.sourceRef, ACTION, op, t.targetId, t.generation, t.milestone ?? '')) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  const s = await db.kbSource.findUnique({ where: { id: t.targetId }, select: { ingestSeq: true, learn: true } });
  if (!s) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if (String(s.ingestSeq) !== t.generation) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  if ((op === 'publish_unlearned' && s.learn) || (op === 'publish_ready' && !s.learn)) throw new AppError('CONFLICT', 409, { trigger: 'learn_changed' });
}
