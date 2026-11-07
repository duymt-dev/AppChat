// Ghi audit nền tảng (TIP-045b annex A2): `admin.*` và action nhạy cảm của nền tảng ghi `platform_audit_log` TRONG commit nền tảng của
// thao tác (cùng ptx với nghiệp vụ) — input / kết quả đã chiếu an toàn (auditSafe), tham chiếu operation + trace, không payload nhạy cảm.
// Không tự ghi audit cho việc đọc audit (không đệ quy).
import type { ActionDef } from '@appchat/actions';
import type { PlatformTx } from '../actions/action-context';
import { uuidv7 } from '../ids';
import { auditSafe, isSecurityAction } from './audit-projection';

export const platformAudited = (actionId: string) => actionId.startsWith('admin.') || isSecurityAction(actionId);

export interface PlatformAuditEntry {
  def: Pick<ActionDef, 'id' | 'secret'>;
  workspaceId: string;
  actorUserId: string | null;
  operationId: string;
  input: unknown;
  result: unknown;
  traceId: string | null;
  at: Date;
}

export async function writePlatformAudit(ptx: PlatformTx, e: PlatformAuditEntry): Promise<void> {
  if (!platformAudited(e.def.id)) return;
  await ptx.platformAuditLog.create({
    data: {
      id: uuidv7(e.at.getTime()),
      actorUserId: e.actorUserId,
      actionId: e.def.id,
      workspaceId: e.workspaceId,
      input: { operation_id: e.operationId, input: auditSafe(e.def, e.input) ?? null } as object,
      result: (auditSafe(e.def, e.result) ?? null) as object,
      traceId: e.traceId,
      createdAt: e.at,
    },
  });
}

/**
 * Event `audit.security_event` đi cùng action_log cờ audit (cùng transaction / outbox) — notify báo Owner, dedupe theo event_consumption.
 * Đổi Chủ sở hữu có thông báo riêng cho cả hai Owner (handler) nên không phát thêm ở đây.
 */
export function securityEvents(actionId: string, logId: string, actor: { type: string; id: string }, onBehalfOf: string | null | undefined, source: string) {
  if (!isSecurityAction(actionId) || actionId === 'workspace.transfer_ownership') return [];
  const actorUserId = actor.type === 'user' ? actor.id : (onBehalfOf ?? null);
  return [{ topic: 'audit.security_event', payload: { action_id: actionId, action_log_id: logId, actor_user_id: actorUserId, source } }];
}
