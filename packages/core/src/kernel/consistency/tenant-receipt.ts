// Pha tenant của thao tác xuyên DB (TIP-045b annex A1): MỘT transaction tenant ghi phần nghiệp vụ (`applyTenant`), tiêu thụ duyệt,
// action_log, outbox và biên nhận unique(operation_id) — chạy lại (request gửi lại / khôi phục) thấy biên nhận thì không ghi đôi.
// Kết quả chuẩn (ActionResult) dựng ở đây, lưu về sổ nền tảng để gửi lại trả đúng kết quả.
import type { ActionDef, ActionResult } from '@appchat/actions';
import type { TenantDb } from '@appchat/db';
import { redactDeep } from '../actions/executor-redact';
import type { ActionContext, TenantTx } from '../actions/action-context';
import type { ActionHandler } from '../actions/handler';
import { writeOutbox } from '../outbox/outbox';
import { isSecurityAction } from '../audit/audit-projection';
import { securityEvents } from '../audit/audit.service';
import type { OperationRow } from './operation-store';
import { inEventTransaction } from '../outbox/transaction';

const json = (v: unknown) => (v === undefined ? undefined : (JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))) as object));

export interface PlatformStageOutcome {
  result: unknown;
  before?: unknown;
  after?: unknown;
  events?: { topic: string; payload: Record<string, unknown> }[];
}

export interface TenantApplyDeps {
  /** Tiêu thụ duyệt AI trong CÙNG transaction (ApprovalGateway.consume) — chỉ thao tác có approvalId. */
  consumeApproval?: (tx: TenantTx) => Promise<void>;
  /** Lưu kết quả chuẩn vào duyệt cùng transaction (run AI tiếp tục bằng kết quả thật, không `{executed:true}`). */
  recordApproval?: (tx: TenantTx, output: unknown) => Promise<void>;
}

/**
 * Áp pha tenant đúng một lần. Trả `{ data, events }` (events = số dòng outbox mới; 0 khi biên nhận đã có — lần gửi lại / khôi phục).
 * `stage` = kết quả pha nền tảng (lưu ở `operation.plan.__stage`) để action_log có before / after / events của handler.
 */
export async function applyTenantStage<O>(
  db: TenantDb,
  ctx: ActionContext,
  def: ActionDef,
  handler: ActionHandler,
  op: OperationRow,
  stage: PlatformStageOutcome,
  deps: TenantApplyDeps = {},
): Promise<{ data: ActionResult<O>; events: number }> {
  const at = new Date(op.context.at);
  return inEventTransaction(db, ctx.workspaceId, async (tx) => {
    const receipt = await tx.operationReceipt.findUnique({ where: { operationId: op.id } });
    if (receipt) {
      const log = await tx.actionLog.findUnique({ where: { id: receipt.actionLogId }, select: { result: true, undoUntil: true } });
      return { data: resultOf<O>(def, log?.result as O, op.actionLogId, log?.undoUntil ?? null), events: 0 };
    }
    await deps.consumeApproval?.(tx);
    const plan = (op.plan ?? {}) as Record<string, unknown>;
    const applied = handler.applyTenant && plan.tenant ? await handler.applyTenant(ctx, plan.tenant as Record<string, unknown>, tx) : {};
    const output = def.output.parse(applied.result ?? stage.result) as O;
    const undoUntil = op.context.undoUntil ? new Date(op.context.undoUntil) : null;
    await tx.actionLog.create({
      data: {
        id: op.actionLogId,
        actionId: op.actionId,
        risk: op.context.risk,
        source: op.context.source as never,
        actorType: op.context.actor.type as never,
        actorId: op.context.actor.id,
        onBehalfOfUserId: op.context.onBehalfOfUserId ?? null,
        runId: op.context.runId ?? null,
        input: (op.logInput ?? {}) as object,
        before: json(redactDeep(applied.before ?? stage.before)),
        after: json(redactDeep(applied.after ?? stage.after)),
        result: json(output),
        status: 'succeeded',
        undoUntil,
        traceId: op.traceId,
        audit: isSecurityAction(op.actionId),
        createdAt: at,
      },
    });
    // Có duyệt AI → event chung `operation.completed` (khoá theo thao tác — chỉ ghi một lần cùng biên nhận); domain AI tự tiếp tục run.
    const done = op.context.approvalId
      ? [{ topic: 'operation.completed', payload: { operation_id: op.id, action_id: op.actionId, approval_id: op.context.approvalId, run_id: op.context.runId ?? null } }]
      : [];
    const events = await writeOutbox(tx, ctx.workspaceId, [...(stage.events ?? []), ...(applied.events ?? []), ...done, ...securityEvents(op.actionId, op.actionLogId, op.context.actor, op.context.onBehalfOfUserId, op.context.source)], at, op.traceId ?? undefined);
    await tx.operationReceipt.create({ data: { operationId: op.id, actionLogId: op.actionLogId, createdAt: at } });
    await deps.recordApproval?.(tx, output);
    return { data: resultOf<O>(def, output, op.actionLogId, undoUntil), events };
  });
}

function resultOf<O>(def: ActionDef, output: O, logId: string, undoUntil: Date | null): ActionResult<O> {
  const ui = def.uiTarget?.(output as never);
  return { result: output, action_log_id: logId, ...(undoUntil ? { undo_until: undoUntil.toISOString() } : {}), ...(ui ? { ui_target: ui } : {}) };
}
