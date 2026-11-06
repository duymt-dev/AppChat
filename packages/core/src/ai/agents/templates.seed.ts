// Seed `agent_template` (DB nền tảng) từ catalog — idempotent theo `key`; thêm mẫu thiếu, KHÔNG ghi đè mẫu Quản trị nền tảng đã sửa
// (TIP-040). Nâng phiên bản mặc định (TIP-022b — template-revisions): chỉ mẫu còn đúng bản dựng sẵn rev trước. Gọi khi boot api / worker.
import type { PlatformDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import { AGENT_TEMPLATES, PROMPT_TEMPLATES } from './catalog';
import { ROLE_DEFAULTS_V2, TEMPLATE_REVISION, planUpgrade } from './template-revisions';

export const templateDefaults = (role: string) => {
  const d = ROLE_DEFAULTS_V2[role] ?? ROLE_DEFAULTS_V2.ops!;
  return { tools: d.tools, intents: d.intents, model_tier: 'advanced', threshold: 70, prompt: PROMPT_TEMPLATES[d.prompt]!.text, revision: TEMPLATE_REVISION };
};

/** Nâng mẫu dựng sẵn chưa bị sửa lên rev hiện tại; mẫu đã sửa giữ nguyên (trả danh sách để quản trị xem trước thay thế). */
export async function upgradeAgentTemplates(db: Pick<PlatformDb, 'agentTemplate'>): Promise<{ upgraded: string[]; customized: string[] }> {
  const rows = await db.agentTemplate.findMany({ select: { id: true, key: true, role: true, defaults: true } });
  const out = { upgraded: [] as string[], customized: [] as string[] };
  for (const r of rows) {
    const p = planUpgrade(r.role, r.defaults);
    if (p.kind === 'customized') out.customized.push(r.key);
    if (p.kind !== 'upgraded') continue;
    // CAS theo nội dung cũ: quản trị sửa đồng thời thì bỏ qua lần này.
    const n = await db.agentTemplate.updateMany({ where: { id: r.id, defaults: { equals: r.defaults ?? {} } }, data: { defaults: p.next as object } });
    if (n.count) out.upgraded.push(r.key);
  }
  return out;
}

export async function seedAgentTemplates(db: Pick<PlatformDb, 'agentTemplate'>): Promise<number> {
  await upgradeAgentTemplates(db);
  const have = new Set((await db.agentTemplate.findMany({ select: { key: true } })).map((t) => t.key));
  const missing = AGENT_TEMPLATES.map((t, sort) => ({ t, sort })).filter(({ t }) => !have.has(t.key));
  if (!missing.length) return 0;
  const r = await db.agentTemplate.createMany({
    data: missing.map(({ t, sort }) => ({
      id: uuidv7(),
      key: t.key,
      role: t.role,
      industryGroup: t.group,
      industry: t.tag,
      name: t.name,
      description: t.desc,
      color: t.color,
      tint: t.tint,
      icon: t.icon,
      defaults: templateDefaults(t.role),
      sort,
    })),
    skipDuplicates: true,
  });
  return r.count;
}
