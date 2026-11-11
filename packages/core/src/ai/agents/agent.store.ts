// Cấu hình AI Agent ↔ cột `ai_agent` (Blueprint §2.2 L397, D29): cột cấu hình là bản nháp; xuất bản chụp `AgentConfig` vào
// `ai_agent_version.config`. Rào chắn khi ghi (§5.3b): tool ⊆ `agentGrantable` ∩ quyền người tạo; risk money / delete luôn vào
// `approval_rules`; `plan.max_agents`. Agent mới / mẫu / Trợ lý dùng chung `blankConfig`.
import { registry, type ActionDef, isAgentGrantable } from '@appchat/actions';
import { AppError, can, isPermissionKey, type AuthzContext, type WeeklySchedule } from '@appchat/shared';
import { TenantSql } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { assertPublishable, scheduleOf } from './schedule-config';

export type AgentRow = NonNullable<Awaited<ReturnType<TenantTx['aiAgent']['findUnique']>>>;
type Role = 'sales' | 'cs' | 'booking' | 'marketing' | 'accounting' | 'ops' | 'custom';

/** Cấu hình agent đúng shape FE `AgentConfig` (input `agent.create` / `agent.update.patch`). */
export interface AgentConfig {
  name: string;
  emoji: string;
  role: Role;
  role_label: string;
  language: 'vi' | 'en' | 'bilingual' | 'auto';
  prompt: string;
  persona: string;
  intents: number[];
  model_tier: 'standard' | 'advanced' | 'max';
  tools: string[];
  channels: string[];
  threshold: number;
  handoff_to: 'staff' | 'team' | 'lead';
  governance: Record<string, boolean>;
  kb_scope: { folder_ids: string[]; tags: string[] };
  template_id?: string;
  keywords: string[];
  working_hours: WorkingHours;
  /** Lịch tuần có cấu trúc (TIP-022b) — dùng khi `working_hours = custom`. */
  weekly_schedule: WeeklySchedule | null;
}

export type WorkingHours = 'always' | 'office' | 'custom';
const HOURS: readonly WorkingHours[] = ['always', 'office', 'custom'];

export const DEFAULT_GOVERNANCE = { grounding: true, pii: true, override: true, audit: true };

export const blankConfig = (name = ''): AgentConfig => ({
  name,
  emoji: '🤖',
  role: 'custom',
  role_label: '',
  language: 'vi',
  prompt: '',
  persona: '',
  intents: [],
  model_tier: 'standard',
  tools: [],
  channels: [],
  threshold: 70,
  handoff_to: 'staff',
  governance: { ...DEFAULT_GOVERNANCE },
  kb_scope: { folder_ids: [], tags: [] },
  keywords: [],
  working_hours: 'always',
  weekly_schedule: null,
});

const GRANTABLE = new Map(registry.filter(isAgentGrantable).map((a) => [a.id, a]));
export const grantableAction = (id: string): ActionDef | undefined => GRANTABLE.get(id);

/** Tool cấp cho agent: phải `agentGrantable` (D51) và người cấp có quyền của action đó (§5.3b). */
export function assertTools(tools: string[], authz: AuthzContext): void {
  const bad = tools.filter((id) => !GRANTABLE.has(id));
  if (bad.length) throw new AppError('VALIDATION_FAILED', 422, { tools: `not_grantable:${bad.slice(0, 5).join(',')}` });
  const denied = tools.filter((id) => {
    const p = GRANTABLE.get(id)!.permission;
    return isPermissionKey(p) && !can(authz, p);
  });
  if (denied.length) throw new AppError('FORBIDDEN', 403, { tools: `not_permitted:${denied.slice(0, 5).join(',')}` });
}

/** Action risk money / delete của agent luôn cần duyệt (§5.3b) — lưu tường minh để Builder / preview hiện. */
export const approvalRulesOf = (tools: string[]) => ({
  always: tools.filter((id) => ['money', 'delete'].includes(GRANTABLE.get(id)?.risk ?? '')),
});

const uniq = <T>(xs: T[]) => [...new Set(xs)];

/** Cấu hình (đã gộp patch) → cột ghi DB. */
export function columnsOf(c: AgentConfig) {
  const tools = uniq(c.tools);
  return {
    name: c.name.trim(),
    emoji: c.emoji || '🤖',
    role: c.role,
    roleLabel: c.role_label,
    language: c.language,
    persona: c.persona,
    systemPrompt: c.prompt,
    intents: uniq(c.intents),
    modelTier: c.model_tier,
    toolIds: tools,
    channels: uniq(c.channels),
    confidenceThreshold: c.threshold,
    handoffTo: c.handoff_to,
    governance: c.governance,
    kbScope: { folder_ids: uniq(c.kb_scope.folder_ids), tags: uniq(c.kb_scope.tags) },
    approvalRules: approvalRulesOf(tools),
    templateKey: c.template_id ?? null,
    keywords: uniq(c.keywords.map((k) => k.trim()).filter(Boolean)),
    workingHours: { mode: c.working_hours },
    weeklySchedule: c.weekly_schedule ? (JSON.parse(JSON.stringify(c.weekly_schedule)) as object) : TenantSql.DbNull,
  };
}

/** Dòng DB → cấu hình (bản nháp). */
export function configOf(r: AgentRow): AgentConfig {
  const kb = (r.kbScope ?? {}) as Partial<AgentConfig['kb_scope']>;
  return {
    name: r.name,
    emoji: r.emoji,
    role: r.role as Role,
    role_label: r.roleLabel,
    language: r.language as AgentConfig['language'],
    prompt: r.systemPrompt,
    persona: r.persona,
    intents: r.intents,
    model_tier: r.modelTier as AgentConfig['model_tier'],
    tools: r.toolIds,
    channels: r.channels,
    threshold: r.confidenceThreshold,
    handoff_to: r.handoffTo as AgentConfig['handoff_to'],
    governance: (r.governance ?? {}) as Record<string, boolean>,
    kb_scope: { folder_ids: kb.folder_ids ?? [], tags: kb.tags ?? [] },
    ...(r.templateKey ? { template_id: r.templateKey } : {}),
    keywords: r.keywords,
    working_hours: hoursOf(r.workingHours),
    weekly_schedule: scheduleOf(r.weeklySchedule),
  };
}

/** `working_hours` jsonb `{ mode }` → chế độ; thiếu / lạ → luôn hoạt động. */
export const hoursOf = (v: unknown): WorkingHours => {
  const m = (v as { mode?: string } | null)?.mode;
  return HOURS.includes(m as WorkingHours) ? (m as WorkingHours) : 'always';
};

/** Input zod (các khoá tuỳ chọn) gộp lên cấu hình hiện có. */
export function merge(base: AgentConfig, patch: Partial<AgentConfig>): AgentConfig {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  return out;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Agent còn sống — id lạ / đã xoá → 404. */
export async function liveAgent(tx: Pick<TenantTx, 'aiAgent'>, id: string): Promise<AgentRow> {
  const a = UUID.test(id) ? await tx.aiAgent.findUnique({ where: { id } }) : null;
  if (!a || a.deletedAt) throw new AppError('NOT_FOUND', 404, { agent_id: 'not_found' });
  return a;
}

export const countLive = (tx: Pick<TenantTx, 'aiAgent'>) => tx.aiAgent.count({ where: { deletedAt: null } });

/** Chụp bản nháp thành phiên bản kế tiếp; agent → `active` (kể cả đang tạm dừng — state-machine `paused —publish→ active`). */
export async function publishDraft(tx: TenantTx, a: AgentRow, by: string | null, note: string, now: Date, cfg: AgentConfig = configOf(a), rollback = false) {
  // TIP-022b: xuất bản mới `custom` cần lịch có cấu trúc; quay lại snapshot cũ giữ đúng hành vi cũ.
  if (!rollback) assertPublishable(cfg);
  const version = a.publishedVersion + 1;
  const id = uuidv7(now.getTime());
  await tx.aiAgentVersion.create({ data: { id, agentId: a.id, version, config: JSON.parse(JSON.stringify(cfg)) as object, publishedBy: by, publishedAt: now, note } });
  await tx.aiAgent.update({ where: { id: a.id }, data: { ...columnsOf(cfg), publishedVersion: version, publishedVersionId: id, draftDirty: false, status: 'active', updatedAt: now } });
  return { version, versionId: id };
}

export const agentEvent = (a: { id: string }, version: number, status: 'draft' | 'active' | 'paused' | 'deleted') => ({
  agent_id: a.id,
  version,
  status,
});
