// Đọc AI Agents cho FE (Blueprint §4.4; FE `features/agents/api.ts`): danh sách (bản nháp + số liệu), một agent, phiên bản, mẫu
// theo ngành (DB nền tảng `agent_template`), meta Builder, tool (D51). Số liệu thẻ do caller truyền (`statsOf` — service insights
// `agentStats`, 30 ngày, theo quyền người xem; TIP-038): hội thoại, tỉ lệ lượt tự xử lý, CSAT ticket giao cho agent; chỉ số không khả dụng
// → 0 + `stats.*.available = false` (FE hiện "—", không phải 0 thật). Danh sách ≤ plan.max_agents dòng (index `ai_agent_live_created_idx`).
import { foldText, type AgentDto, type AgentStatsDto, type AgentTemplateDefaultsDto, type AgentToolsDto, type StatValueDto } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import { connectedKeys, groupTools } from './agent-tools';
import { configOf, liveAgent, type AgentConfig, type AgentRow } from './agent.store';
import { templateDefaults } from './templates.seed';
import { scheduleState } from './schedule-config';
import { agentSuggests } from './agent-suggests';
import { AGENT_EMOJIS, AGENT_INTENTS, AGENT_TAXONOMY, CHANNEL_COLORS, PROMPT_TEMPLATES, TEST_SEED } from './catalog';

type Db = Pick<TenantDb, 'aiAgent' | 'aiAgentVersion' | '$queryRaw' | 'channelAccount' | 'integrationConnection'>;

const val = (s: StatValueDto | undefined) => (s?.available ? (s.value ?? 0) : 0);

/** Thẻ agent: số liệu từ service insights (`agentStats` — cùng định nghĩa với /agents/:id/stats); thiếu → 0 + `stats` để FE hiện "—". */
function toDto(a: AgentRow, s: AgentStatsDto | undefined): AgentDto {
  return {
    id: a.id,
    ...configOf(a),
    schedule_state: scheduleState(configOf(a)),
    status: a.status,
    conversations: val(s?.conversations),
    resolve_rate: Math.round(val(s?.resolve_rate)),
    csat: val(s?.csat),
    ...(s ? { stats: s } : {}),
    version: a.publishedVersion,
    dirty: a.draftDirty,
  };
}

export type AgentStatsOf = (ids: string[]) => Promise<Map<string, AgentStatsDto>>;
const none: AgentStatsOf = async () => new Map();

export async function listAgents(db: Db, statsOf: AgentStatsOf = none): Promise<AgentDto[]> {
  const rows = await db.aiAgent.findMany({ where: { deletedAt: null }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 200 });
  const s = await statsOf(rows.map((r) => r.id));
  return rows.map((r) => toDto(r, s.get(r.id)));
}

export async function getAgent(db: Db, id: string, statsOf: AgentStatsOf = none): Promise<AgentDto> {
  const a = await liveAgent(db, id);
  return toDto(a, (await statsOf([a.id])).get(a.id));
}

export async function agentVersions(db: Db, id: string, names: (ids: string[]) => Promise<Map<string, string>>) {
  const a = await liveAgent(db, id);
  const rows = await db.aiAgentVersion.findMany({ where: { agentId: a.id }, orderBy: { version: 'desc' }, take: 50 });
  const who = await names([...new Set(rows.map((r) => r.publishedBy).filter((x): x is string => !!x))]);
  return rows.map((r) => ({ version: r.version, published_at: r.publishedAt.toISOString(), published_by: (r.publishedBy && who.get(r.publishedBy)) || '—', note: r.note }));
}

/** Quyền agent trong Builder (mọi tool cấp được, đánh dấu đã cấp). */
export async function agentTools(db: Db, id: string): Promise<AgentToolsDto> {
  const a = await liveAgent(db, id);
  return { agent: { id: a.id, name: a.name }, groups: groupTools(a.toolIds, await connectedKeys(db)) };
}

/**
 * Quyền hiệu lực của agent phụ trách hội thoại (REQ-C11, chỉ đọc): `conversation.assignee_agent_id`, không có thì agent gán cho
 * tài khoản kênh của hội thoại (`channel_account.settings.agent_id`). Không có agent → `agent: null`, nhóm rỗng.
 */
export async function conversationAgentTools(db: Db, conv: { assigneeAgentId: string | null; channelAccountId: string }): Promise<AgentToolsDto> {
  let id = conv.assigneeAgentId;
  if (!id) {
    const acc = await db.channelAccount.findUnique({ where: { id: conv.channelAccountId }, select: { settings: true } });
    id = ((acc?.settings ?? {}) as { agent_id?: string | null }).agent_id ?? null;
  }
  const a = id ? await liveAgent(db, id).catch(() => null) : null;
  if (!a) return { agent: null, groups: [] };
  return { agent: { id: a.id, name: a.name }, groups: groupTools(a.toolIds, await connectedKeys(db), true) };
}

export interface TemplateFilter {
  q?: string;
  role?: string;
  group?: string;
  industry?: string;
  name?: string;
}

const ROLES = ['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom'] as const;
const roleOf = (r: string): AgentConfig['role'] => ((ROLES as readonly string[]).includes(r) ? (r as AgentConfig['role']) : 'custom');

/** `agent_template.defaults` (seed theo vai trò — có thể đã sửa ở Quản trị nền tảng) → shape FE; thiếu khoá → mặc định của vai trò. */
function defaultsOf(role: string, v: unknown): AgentTemplateDefaultsDto {
  const d = { ...templateDefaults(role), ...((v ?? {}) as Partial<AgentTemplateDefaultsDto>) };
  return { tools: d.tools, intents: d.intents, model_tier: d.model_tier as AgentTemplateDefaultsDto['model_tier'], threshold: d.threshold, prompt: d.prompt };
}

/** Mẫu agent (DB nền tảng): lọc Nhóm ngành → Ngành, tên, tìm không dấu trong tên / mô tả / ngành. */
export async function listTemplates(p: Pick<PlatformDb, 'agentTemplate'>, f: TemplateFilter) {
  const g = f.group && f.group !== 'all' ? f.group : undefined;
  const rows = await p.agentTemplate.findMany({
    where: {
      active: true,
      ...(g ? { industryGroup: g } : {}),
      ...(f.industry && f.industry !== 'all' ? { industry: f.industry } : {}),
      ...(f.name && f.name !== 'all' ? { name: f.name } : {}),
      ...(f.role && f.role !== 'all' ? { role: f.role } : {}),
    },
    orderBy: [{ sort: 'asc' }, { key: 'asc' }],
  });
  const q = foldText(f.q ?? '');
  const data = rows
    .filter((t) => !q || [t.name, t.description, t.industry].some((v) => foldText(v).includes(q)))
    .map((t) => ({ id: t.key, name: t.name, desc: t.description, tag: t.industry, color: t.color, tint: t.tint, icon: t.icon, role: roleOf(t.role), defaults: defaultsOf(t.role, t.defaults) }));
  return { data, total: data.length };
}

/** Meta Builder (`GET /v1/agents/meta`): taxonomy, emoji, ý định, kênh, mẫu prompt, gợi ý, tên mẫu (chọn nhanh). */
export async function agentsMeta(p: Pick<PlatformDb, 'agentTemplate'>, db: Pick<TenantDb, 'aiAgent' | '$queryRaw'>, now: Date, locale = 'vi') {
  const names = await p.agentTemplate.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }], take: 20, select: { name: true, industry: true } });
  return {
    taxonomy: AGENT_TAXONOMY,
    emojis: AGENT_EMOJIS,
    intents: AGENT_INTENTS,
    channels: Object.entries(CHANNEL_COLORS).map(([key, color]) => ({ key, color })),
    tools: [] as { key: string; action_id: string }[],
    prompt_templates: PROMPT_TEMPLATES,
    test_seed: TEST_SEED,
    ai_suggests: await agentSuggests(db, now, locale),
    template_names: names.map((n) => ({ name: n.name, tag: n.industry })),
  };
}
