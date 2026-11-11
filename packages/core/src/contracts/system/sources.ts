// Nguồn trigger + verifier của `contract.system_transition` (TIP-003c §1.3, §3.2): thế hệ = hạn link ký (expire_link) / ngày kết thúc
// (expire_contract, renewal_notice) hiện tại — gia hạn link / sửa ngày kết thúc → trigger cũ 409. Không tin payload queue.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { stableTriggerId, type SystemTrigger } from '../../kernel/actions/system';

export const CONTRACT_SYSTEM_ACTOR = 'contract-system';
const ACTION = 'contract.system_transition';
type Op = 'expire_link' | 'expire_contract' | 'renewal_notice';
const iso = (d: Date | null | undefined) => d?.toISOString() ?? '';
/** Cột `date` (ngày kết thúc): thế hệ là chuỗi ngày YYYY-MM-DD — không phụ thuộc cách driver dựng Date từ `date`. */
const day = (d: Date | string | null | undefined) => (d instanceof Date ? d.toISOString().slice(0, 10) : (d ?? '').slice(0, 10));

export function contractTrigger(ws: string, operation: Op, c: { id: string; signLinkExpiresAt?: Date | null; endDate?: Date | string | null }): SystemTrigger {
  const generation = operation === 'expire_link' ? iso(c.signLinkExpiresAt) : day(c.endDate);
  const milestone = operation === 'renewal_notice' ? 'T-30' : '';
  const sourceRef = `contract.${operation}`;
  const t = stableTriggerId('schedule', sourceRef, ACTION, operation, c.id, generation, milestone);
  return { workspaceId: ws, actionId: ACTION, sourceKind: 'schedule', sourceRef, targetId: c.id, generation, milestone, input: { trigger_id: t, entity_id: c.id, operation }, actor: CONTRACT_SYSTEM_ACTOR, idempotencyKey: `system:${t}` };
}

export async function verifyContractTrigger(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string; operation?: string };
  const op = String(i.operation);
  if (i.entity_id !== t.targetId || t.sourceRef !== `contract.${op}` || i.trigger_id !== stableTriggerId('schedule', t.sourceRef, ACTION, op, t.targetId, t.generation, t.milestone ?? '')) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  const c = await db.contract.findUnique({ where: { id: t.targetId }, select: { signLinkExpiresAt: true, endDate: true, deletedAt: true } });
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if ((op === 'expire_link' ? iso(c.signLinkExpiresAt) : day(c.endDate)) !== t.generation) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
}
