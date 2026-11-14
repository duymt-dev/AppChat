// Nguồn trigger + verifier của `appointment.system_transition` (TIP-003c §1.3, §3.2): thế hệ = hạn giữ chỗ (expire_hold) / giờ hẹn
// (remind) hiện tại — đổi giờ / gia hạn giữ chỗ → trigger cũ 409; mốc nhắc là milestone. Không tin payload queue.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { stableTriggerId, type SystemTrigger } from '../../kernel/actions/system';

export const BOOKING_SYSTEM_ACTOR = 'booking-system';
const ACTION = 'appointment.system_transition';
const iso = (d: Date | null | undefined) => d?.toISOString() ?? '';

function trigger(ws: string, operation: 'expire_hold' | 'remind', id: string, generation: string, milestone = ''): SystemTrigger {
  const t = stableTriggerId('schedule', `appointment.${operation}`, ACTION, operation, id, generation, milestone);
  return { workspaceId: ws, actionId: ACTION, sourceKind: 'schedule', sourceRef: `appointment.${operation}`, targetId: id, generation, milestone, input: { trigger_id: t, entity_id: id, operation }, actor: BOOKING_SYSTEM_ACTOR, idempotencyKey: `system:${t}` };
}

export const holdExpireTrigger = (ws: string, a: { id: string; holdExpiresAt: Date | null }) => trigger(ws, 'expire_hold', a.id, iso(a.holdExpiresAt));
export const appointmentRemindTrigger = (ws: string, a: { id: string; startAt: Date }, step: string) => trigger(ws, 'remind', a.id, iso(a.startAt), step);

export async function verifyBookingTrigger(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string; operation?: string };
  const op = String(i.operation);
  if (i.entity_id !== t.targetId || t.sourceRef !== `appointment.${op}` || i.trigger_id !== stableTriggerId('schedule', t.sourceRef, ACTION, op, t.targetId, t.generation, t.milestone ?? '')) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  const a = await db.appointment.findUnique({ where: { id: t.targetId }, select: { holdExpiresAt: true, startAt: true, deletedAt: true } });
  if (!a || a.deletedAt) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if ((op === 'expire_hold' ? iso(a.holdExpiresAt) : iso(a.startAt)) !== t.generation) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
}
