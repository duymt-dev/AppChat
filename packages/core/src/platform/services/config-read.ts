// Đọc cấu hình nền tảng cho màn /admin (TIP-040 pha 2): gói, provider (KHÔNG trả key / header — chỉ có / không), route theo nhóm kèm
// phiên bản nhóm (CAS), đơn giá, mẫu agent. Bảng nhỏ (chục dòng) — đọc đủ, không phân trang; mỗi dòng kèm `version` cho if_version.
import type { PlatformDb } from '@appchat/db';
import { readRevision, routeScope } from './config-revision';

const TIERS = ['standard', 'advanced', 'max'] as const;
const PURPOSES = ['chat', 'embed', 'rerank'] as const;

export class ConfigReadService {
  constructor(private readonly db: PlatformDb) {}

  async plans() {
    const rows = await this.db.plan.findMany({ orderBy: [{ sort: 'asc' }, { key: 'asc' }] });
    return rows.map((p) => {
      const f = (p.features ?? {}) as { desc?: string; popular?: boolean; features?: string[] };
      return {
        key: p.key,
        version: p.version,
        segment: p.segment,
        name: p.name,
        price_month: p.priceMonth === null ? null : String(p.priceMonth),
        price_year: p.priceYear === null ? null : String(p.priceYear),
        credits_month: p.creditsMonth === null ? null : Number(p.creditsMonth),
        max_users: p.maxUsers,
        max_channels: p.maxChannels,
        max_agents: p.maxAgents,
        desc: f.desc ?? '',
        popular: !!f.popular,
        features: f.features ?? [],
        active: p.active,
        sort: p.sort,
        is_trial_plan: p.isTrialPlan,
      };
    });
  }

  async providers() {
    const rows = await this.db.llmProvider.findMany({ orderBy: { key: 'asc' } });
    return rows.map((p) => ({
      key: p.key,
      version: p.version,
      kind: p.kind,
      name: p.name,
      base_url: p.baseUrl,
      has_api_key: !!p.apiKeyEnc,
      header_names: Object.keys((p.headers ?? {}) as Record<string, unknown>).sort(),
      capabilities: (p.capabilities ?? {}) as Record<string, boolean>,
      status: p.status,
      last_probe_at: p.lastProbeAt?.toISOString() ?? null,
      last_error: p.lastError,
    }));
  }

  async routes() {
    const rows = await this.db.modelRoute.findMany({ orderBy: [{ tier: 'asc' }, { purpose: 'asc' }, { priority: 'asc' }] });
    const groups = [];
    for (const tier of TIERS)
      for (const purpose of PURPOSES)
        groups.push({
          tier,
          purpose,
          version: Number(await readRevision(this.db, routeScope(tier, purpose))),
          routes: rows.filter((r) => r.tier === tier && r.purpose === purpose).map((r) => ({ provider_key: r.providerKey, model: r.model, vision: (r.params as { vision?: unknown } | null)?.vision === true })),
        });
    return groups;
  }

  async prices() {
    const rows = await this.db.modelPrice.findMany({ orderBy: [{ providerKey: 'asc' }, { model: 'asc' }] });
    return rows.map((p) => ({
      provider_key: p.providerKey,
      model: p.model,
      version: p.version,
      tier: p.tier,
      credits_per_1k_in: String(p.creditsPer1kIn),
      credits_per_1k_out: String(p.creditsPer1kOut),
      active: p.active,
      updated_at: p.updatedAt.toISOString(),
    }));
  }

  async templates() {
    const rows = await this.db.agentTemplate.findMany({ orderBy: [{ sort: 'asc' }, { key: 'asc' }] });
    return rows.map((t) => {
      const d = (t.defaults ?? {}) as { tools?: string[]; intents?: number[]; model_tier?: string; threshold?: number; prompt?: string };
      return {
        key: t.key,
        version: t.version,
        role: t.role,
        industry_group: t.industryGroup,
        industry: t.industry,
        name: t.name,
        description: t.description,
        color: t.color,
        tint: t.tint,
        icon: t.icon,
        defaults: { tools: d.tools ?? [], intents: d.intents ?? [], model_tier: d.model_tier ?? 'advanced', threshold: d.threshold ?? 70, prompt: d.prompt ?? '' },
        active: t.active,
        sort: t.sort,
      };
    });
  }
}
