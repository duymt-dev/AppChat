// Lưu tác vụ tự chủ (Blueprint §2.2 `ai_task`, §5.4): kiểm cấu hình (cách chạy ↔ cron / sự kiện, agent đang chạy, mức AI theo gói),
// tính `next_run_at` theo giờ workspace, ảnh chụp cho action_log (hoàn tác).
import { AI_TASK_TEMPLATE_DEFS, AppError, interpolate, nextCronRun, parseCron, serverMessages, tierAllowed, type AiTaskTemplate, type AiTierKey, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export type TaskRow = NonNullable<Awaited<ReturnType<TenantTx['aiTask']['findUnique']>>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DEFAULT_CRON = '0 8 * * *';

/**
 * Tác vụ còn sống mà người gọi được đụng tới: Chủ sở hữu / vai trò xem toàn workspace (insights `all`) → mọi tác vụ; còn lại chỉ tác vụ
 * mình tạo (tác vụ chạy bằng quyền người tạo — sửa tác vụ người khác là mượn quyền). Không thấy → 404.
 */
export async function liveTask(tx: Pick<TenantTx, 'aiTask'>, id: string, authz?: AuthzContext): Promise<TaskRow> {
  const t = UUID.test(id) ? await tx.aiTask.findUnique({ where: { id } }) : null;
  const mine = !authz || authz.isOwner || authz.scope.insights === 'all' || t?.createdByUserId === authz.userId;
  if (!t || t.deletedAt || !mine) throw new AppError('NOT_FOUND', 404, { task_id: 'not_found' });
  return t;
}

export interface TaskInput {
  name?: string;
  goal?: string;
  prompt?: string;
  department?: string;
  agent_id?: string;
  template?: AiTaskTemplate;
  params?: Record<string, number>;
  trigger?: 'manual' | 'schedule' | 'event';
  cron?: string;
  event_type?: string;
  data_scope?: string[];
  tools?: string[];
  model_tier?: AiTierKey;
  ask_before_send?: boolean;
  credit_limit_per_run?: number;
}

/** Agent thực hiện: id gửi lên (phải đang chạy), hoặc agent đang chạy sửa gần nhất; mẫu briefing không cần. */
export async function resolveAgent(tx: Pick<TenantTx, 'aiAgent'>, agentId: string | undefined, template: string | null | undefined): Promise<string | null> {
  if (agentId) {
    const a = UUID.test(agentId) ? await tx.aiAgent.findUnique({ where: { id: agentId }, select: { id: true, status: true, deletedAt: true, publishedVersion: true } }) : null;
    if (!a || a.deletedAt) throw new AppError('VALIDATION_FAILED', 422, { agent_id: 'not_found' });
    if (a.status !== 'active' || !a.publishedVersion) throw new AppError('VALIDATION_FAILED', 422, { agent_id: 'not_active' });
    return a.id;
  }
  if (template === 'briefing') return null;
  const rows = await tx.aiAgent.findMany({ where: { status: 'active', deletedAt: null, publishedVersion: { gt: 0 } }, orderBy: { updatedAt: 'desc' }, take: 1, select: { id: true } });
  if (!rows[0]) throw new AppError('VALIDATION_FAILED', 422, { agent_id: 'none_active' });
  return rows[0].id;
}

/** Cột lịch / sự kiện theo cách chạy (CHECK `ai_task_trigger_chk`). */
export function triggerCols(trigger: 'manual' | 'schedule' | 'event', cron: string | null | undefined, eventType: string | null | undefined) {
  if (trigger === 'schedule') {
    const c = cron?.trim() || DEFAULT_CRON;
    if (!parseCron(c)) throw new AppError('VALIDATION_FAILED', 422, { cron: 'invalid' });
    return { cron: c, eventType: null };
  }
  if (trigger === 'event') {
    if (!eventType) throw new AppError('VALIDATION_FAILED', 422, { event_type: 'required' });
    return { cron: null, eventType };
  }
  return { cron: null, eventType: null };
}

export const nextRunOf = (t: Pick<TaskRow, 'trigger' | 'cron' | 'status'>, after: Date, timeZone: string): Date | null =>
  t.trigger === 'schedule' && t.status === 'active' && t.cron ? nextCronRun(t.cron, after, timeZone) : null;

export function assertTier(tier: AiTierKey | undefined, planKey: string | null): void {
  if (tier && !tierAllowed(tier, planKey)) throw new AppError('PLAN_LIMIT_REACHED', 402, { resource: 'ai_tier', tier });
}

/** Tên / mục tiêu mặc định của mẫu chủ động theo ngôn ngữ workspace (tham số thay `{days}`…). */
export function templateText(template: AiTaskTemplate, locale: string, params: Record<string, number> = {}) {
  const m = serverMessages(locale).tasks.template[template];
  const p = { ...AI_TASK_TEMPLATE_DEFS[template].params, ...params };
  return { name: m.name, goal: interpolate(m.goal, p) };
}

/** Ảnh chụp các cột sửa được (before / after của action_log — hoàn tác đặt lại đúng các cột này). */
export const snapOf = (t: TaskRow) => ({
  id: t.id,
  name: t.name,
  goal: t.goal,
  prompt: t.prompt,
  department: t.department,
  agentId: t.agentId,
  template: t.template,
  params: t.params,
  trigger: t.trigger,
  cron: t.cron,
  eventType: t.eventType,
  dataScope: t.dataScope,
  toolIds: t.toolIds,
  creditLimitPerRun: t.creditLimitPerRun,
  askBeforeSend: t.askBeforeSend,
  modelTier: t.modelTier,
  status: t.status,
  nextRunAt: t.nextRunAt?.toISOString() ?? null,
  deletedAt: t.deletedAt?.toISOString() ?? null,
  version: t.version,
});
export type TaskSnap = ReturnType<typeof snapOf>;

export const restoreData = (s: TaskSnap) => ({
  name: s.name,
  goal: s.goal,
  prompt: s.prompt,
  department: s.department,
  agentId: s.agentId,
  template: s.template,
  params: s.params as object,
  trigger: s.trigger,
  cron: s.cron,
  eventType: s.eventType,
  dataScope: s.dataScope,
  toolIds: s.toolIds,
  creditLimitPerRun: s.creditLimitPerRun,
  askBeforeSend: s.askBeforeSend,
  modelTier: s.modelTier,
  status: s.status,
  nextRunAt: s.nextRunAt ? new Date(s.nextRunAt) : null,
  deletedAt: s.deletedAt ? new Date(s.deletedAt) : null,
});
