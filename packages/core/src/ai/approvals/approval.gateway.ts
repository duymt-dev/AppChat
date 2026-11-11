// Cổng duyệt của ActionExecutor (Blueprint §3.2 bước 4, §5.1; DC-011): agent / tác vụ gọi action policy `approval` → ghi
// `approval_request` (pending, hết hạn theo `ai_governance.approval_ttl_hours` — 72 giờ, D52) + event `approval.requested`
// (thông báo `ai_review` cho người duyệt). Tiêu đề / tóm tắt lấy từ `preview()` của handler domain nếu có.
// `consume` chạy TRONG transaction của action đã duyệt (job `ai-resume`): đúng action + input, `approved`, chưa chạy → đánh dấu đã chạy.
import type { ActionDef } from '@appchat/actions';
import { toJson } from '@appchat/ai';
import { AppError, interpolate, serverMessages } from '@appchat/shared';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { ApprovalGateway } from '../../kernel/actions/executor';
import type { ActionHandlerRegistry } from '../../kernel/actions/handler-registry';
import { hashInput } from '../../kernel/actions/confirm-token';
import { uuidv7 } from '../../kernel/ids';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';
import { approvalPermissionOf } from './approval-permission';
import { inEventTransaction } from '../../kernel/outbox/transaction';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GatewayDeps {
  resolver: TenantDbResolver;
  handlers: ActionHandlerRegistry;
  kv: KeyValueStore;
  now: () => Date;
  /** Hẹn job kiểm hết hạn (queue `ai-resume`) — thiếu Redis thì bỏ qua (đọc vẫn coi dòng quá hạn là hết hạn). */
  expire?: (ws: string, approvalId: string, at: Date) => Promise<void>;
}

export class DbApprovalGateway implements ApprovalGateway {
  constructor(private readonly d: GatewayDeps) {}

  async request(ctx: ActionContext, def: ActionDef, input: unknown): Promise<string> {
    const db = await this.d.resolver.get(TenantContexts.system(ctx.workspaceId, `approval:${def.id}`));
    const t = serverMessages('vi').ai;
    const now = this.d.now();
    const id = uuidv7(now.getTime());
    const agentId = ctx.actor.type === 'agent' && UUID.test(ctx.actor.id) ? ctx.actor.id : null;
    const handler = this.d.handlers.get(def.id);
    let expiresAt = now;
    const events = await inEventTransaction(db, ctx.workspaceId, async (tx) => {
      // Preview của handler domain (nếu có) — lỗi preview không chặn việc xin duyệt.
      const preview = handler?.preview ? await handler.preview(ctx, input, tx).catch(() => null) : null;
      const agent = agentId ? await tx.aiAgent.findUnique({ where: { id: agentId }, select: { name: true } }) : null;
      const gov = await tx.aiGovernance.findUnique({ where: { id: 1 }, select: { approvalTtlHours: true } });
      const agentName = agent?.name ?? t.agent.assistant;
      const title = preview?.summary || interpolate(t.approval.title, { action: def.id });
      const permission = approvalPermissionOf(def);
      expiresAt = new Date(now.getTime() + (gov?.approvalTtlHours ?? 72) * 3_600_000);
      await tx.approvalRequest.create({
        data: {
          id,
          runId: ctx.runId && UUID.test(ctx.runId) ? ctx.runId : null,
          stepIdx: ctx.stepId ? Number(ctx.stepId) || null : null,
          agentId,
          actionId: def.id,
          input: toJson(input) as object,
          inputHash: hashInput(input),
          ...(preview ? { preview: toJson(preview) as object } : {}),
          risk: def.risk,
          permission,
          title: title.slice(0, 200),
          summary: interpolate(t.approval.summary, { agent: agentName, action: title }).slice(0, 500),
          reason: t.approval.reason[def.risk],
          source: ctx.source,
          onBehalfOfUserId: ctx.onBehalfOfUserId ?? null,
          requestedAt: now,
          expiresAt,
        },
      });
      return writeOutbox(tx, ctx.workspaceId, [{ topic: 'approval.requested', payload: { approval_id: id, action_id: def.id, permission, agent: agentName, title } }], now);
    });
    if (events) await markDirty(this.d.kv, ctx.workspaceId);
    await this.d.expire?.(ctx.workspaceId, id, expiresAt).catch(() => undefined);
    return id;
  }

  /** `inputHash` có sẵn (thao tác nền tảng áp tenant sau — input thô không lưu ở sổ, TIP-045b) → so hash này thay vì băm lại input. */
  async consume(tx: TenantTx, ctx: ActionContext, actionId: string, input: unknown, inputHash?: string): Promise<void> {
    const id = ctx.approvalId!;
    const a = UUID.test(id) ? await tx.approvalRequest.findUnique({ where: { id } }) : null;
    if (!a || a.actionId !== actionId || a.inputHash !== (inputHash ?? hashInput(input))) throw new AppError('FORBIDDEN', 403, { approval_id: 'mismatch' });
    if (a.status !== 'approved' && a.status !== 'edited') throw new AppError('INVALID_STATE', 409, { approval: a.status });
    // Chốt một lần: chỉ dòng chưa chạy được đánh dấu (hai job song song → một thắng, transaction kia huỷ).
    const r = await tx.approvalRequest.updateMany({ where: { id, executedAt: null }, data: { executedAt: this.d.now() } });
    if (r.count !== 1) throw new AppError('CONFLICT', 409, { approval: 'already_executed' });
  }

  /** Kết quả chuẩn của action đã duyệt (cùng transaction tiêu thụ) — job tiếp tục run dùng đúng kết quả này, không `{executed:true}`. */
  async record(tx: TenantTx, ctx: ActionContext, output: unknown): Promise<void> {
    const a = await tx.approvalRequest.findUnique({ where: { id: ctx.approvalId! }, select: { result: true } });
    if (a && a.result === null) await tx.approvalRequest.update({ where: { id: ctx.approvalId! }, data: { result: toJson({ kind: 'ok', output }) as object } });
  }
}
