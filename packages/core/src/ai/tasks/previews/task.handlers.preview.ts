// Preview tác vụ AI tự chủ (TIP-023b R2.8): tạo → tác vụ mới (tên · cách chạy · lịch · mức AI · hạn credit) + cảnh báo chạy ngay khi
// `manual`; sửa → trước / sau chỉ trường đổi; tạm dừng / xoá → trạng thái; chạy ngay → đang có lượt dở → 409. Mức AI vượt gói → 402,
// agent / tác vụ lạ → 404 như execute. Chỉ đọc (không tạo run, không đẩy queue).
import { AI_TASK_TEMPLATE_DEFS, AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, aiTaskCreate, aiTaskDelete, aiTaskPause, aiTaskRunNow, aiTaskUpdate } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { assertTier, liveTask, resolveAgent, triggerCols } from '../task.store';

export async function createPreview(tx: TenantTx, i: ActionInput<typeof aiTaskCreate>, planKey: string | null): Promise<ActionPreview> {
  assertTier(i.model_tier, planKey);
  const tpl = i.template ? AI_TASK_TEMPLATE_DEFS[i.template] : null;
  const agentId = await resolveAgent(tx, i.agent_id, i.template);
  const trig = triggerCols(i.trigger, i.cron ?? (i.trigger === 'schedule' ? tpl?.cron : undefined), i.event_type);
  return preview('config', i.name, {
    changes: [created('ai_task', { name: i.name, trigger: i.trigger, cron: trig.cron, event_type: trig.eventType, agent_id: agentId, model_tier: i.model_tier, credit_limit_per_run: i.credit_limit_per_run, ask_before_send: i.ask_before_send })],
    ...(i.trigger === 'manual' ? { warnings: ['runs_now'] } : {}),
  });
}

export async function updatePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof aiTaskUpdate>, planKey: string | null): Promise<ActionPreview> {
  const t = await liveTask(tx, i.task_id, ctx.authz);
  const p = i.patch;
  assertTier(p.model_tier, planKey);
  const agentId = p.agent_id !== undefined ? await resolveAgent(tx, p.agent_id, p.template ?? t.template) : undefined;
  const cur = { name: t.name, goal: t.goal, prompt: t.prompt, department: t.department, agent_id: t.agentId, template: t.template, trigger: t.trigger, cron: t.cron, event_type: t.eventType, model_tier: t.modelTier, ask_before_send: t.askBeforeSend, credit_limit_per_run: t.creditLimitPerRun, data_scope: t.dataScope, tools: t.toolIds, params: t.params };
  const patch = { name: p.name, goal: p.goal, prompt: p.prompt, department: p.department, agent_id: agentId, template: p.template, trigger: p.trigger, cron: p.cron, event_type: p.event_type, model_tier: p.model_tier, ask_before_send: p.ask_before_send, credit_limit_per_run: p.credit_limit_per_run, data_scope: p.data_scope, tools: p.tools, params: p.params };
  return preview('config', t.name, { changes: updated('ai_task', t.id, cur, patch) });
}

export async function pausePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof aiTaskPause>): Promise<ActionPreview> {
  const t = await liveTask(tx, i.task_id, ctx.authz);
  return preview('config', t.name, { changes: updated('ai_task', t.id, { status: t.status }, { status: i.paused ? 'paused' : 'active' }) });
}

export async function deletePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof aiTaskDelete>): Promise<ActionPreview> {
  const t = await liveTask(tx, i.task_id, ctx.authz);
  return preview('config', t.name, { changes: [removed('ai_task', t.id, { name: t.name, trigger: t.trigger, status: t.status })] });
}

export async function runNowPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof aiTaskRunNow>): Promise<ActionPreview> {
  const t = await liveTask(tx, i.task_id, ctx.authz);
  if (await tx.aiRun.count({ where: { taskId: t.id, status: { in: ['queued', 'running'] } } })) throw new AppError('CONFLICT', 409, { task_id: 'running' });
  return preview('write', t.name, { changes: [created('ai_run', { task: t.name, model_tier: t.modelTier, max_credits: t.creditLimitPerRun })], ...(t.status === 'paused' ? { warnings: ['task_paused'] } : {}) });
}
