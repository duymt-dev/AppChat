// Nguồn trigger + verifier của `channel.system_transition` (TIP-003c §1.3, §4.5): đăng nhập → nguồn `ingress`, ref = lần đăng nhập
// (attempt), thế hệ = attempt; đánh dấu không dùng được → nguồn `event` của phiên, thế hệ = session_generation lúc phát hiện. Verifier đọc
// lại tài khoản đã lưu — thế hệ đã đổi → 409 (lỗi trễ của phiên cũ không hạ kết nối mới).
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { stableTriggerId, type SystemTrigger } from '../../kernel/actions/system';

export const CHANNEL_SYSTEM_ACTOR = 'channel-system';
const ACTION = 'channel.system_transition';
type Op = 'commit_login_result' | 'mark_expired' | 'mark_send_errors';

function trigger(ws: string, operation: Op, accountId: string, sourceRef: string, generation: string): SystemTrigger {
  const kind = operation === 'commit_login_result' ? ('ingress' as const) : ('event' as const);
  const t = stableTriggerId(kind, sourceRef, ACTION, operation, accountId, generation, '');
  return { workspaceId: ws, actionId: ACTION, sourceKind: kind, sourceRef, targetId: accountId, generation, milestone: '', input: { trigger_id: t, entity_id: accountId, operation }, actor: CHANNEL_SYSTEM_ACTOR, idempotencyKey: `system:${t}` };
}

export const loginTrigger = (ws: string, accountId: string, attempt: string) => trigger(ws, 'commit_login_result', accountId, attempt, attempt);
/** Cùng thế hệ phiên = cùng một sự cố (một biên nhận); mã lỗi an toàn cho health stage riêng (staging.ts). */
export const unavailableTrigger = (ws: string, accountId: string, reason: 'expired' | 'send_errors', generation: number) =>
  trigger(ws, reason === 'expired' ? 'mark_expired' : 'mark_send_errors', accountId, `session:${generation}`, String(generation));

export async function verifyChannelTrigger(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string; operation?: string };
  const op = String(i.operation) as Op;
  if (i.entity_id !== t.targetId || i.trigger_id !== stableTriggerId(t.sourceKind, t.sourceRef, ACTION, op, t.targetId, t.generation, t.milestone ?? '')) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  const a = await db.channelAccount.findUnique({ where: { id: t.targetId }, select: { sessionGeneration: true } });
  if (!a) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if (op === 'commit_login_result') {
    if (t.sourceKind !== 'ingress' || t.sourceRef !== t.generation) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
    return;
  }
  if (t.sourceKind !== 'event' || t.sourceRef !== `session:${t.generation}` || String(a.sessionGeneration) !== t.generation) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
}
