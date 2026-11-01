// Seed `agent_template` (DB nền tảng) từ catalog — idempotent theo `key`; chỉ thêm mẫu thiếu, KHÔNG ghi đè (Quản trị nền tảng có
// thể đã sửa — TIP-040). Gọi khi boot api / worker (AiModule) và trong test.
import type { PlatformDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';
import { AGENT_TEMPLATES, PROMPT_TEMPLATES } from './catalog';

/** Cấu hình mặc định theo vai trò (D15): tool, ý định, mức AI, mẫu prompt. */
const ROLE_DEFAULTS: Record<string, { tools: string[]; intents: number[]; prompt: number }> = {
  sales: { tools: ['contact.update', 'contact.set_stage', 'quote.create', 'conversation.handoff'], intents: [0, 1], prompt: 1 },
  cs: { tools: ['ticket.create', 'ticket.search', 'conversation.handoff', 'conversation.tag'], intents: [2, 3, 4], prompt: 0 },
  booking: { tools: ['appointment.find_slots', 'appointment.create', 'appointment.reschedule', 'conversation.handoff'], intents: [1, 5], prompt: 2 },
  marketing: { tools: ['campaign.suggest', 'segment.preview', 'contact.tag'], intents: [0, 1], prompt: 1 },
  accounting: { tools: ['invoice.create', 'conversation.handoff'], intents: [6], prompt: 0 },
  ops: { tools: ['conversation.assign', 'conversation.handoff', 'ticket.create'], intents: [2], prompt: 3 },
};

export const templateDefaults = (role: string) => {
  const d = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.ops!;
  return { tools: d.tools, intents: d.intents, model_tier: 'advanced', threshold: 70, prompt: PROMPT_TEMPLATES[d.prompt]!.text };
};

export async function seedAgentTemplates(db: Pick<PlatformDb, 'agentTemplate'>): Promise<number> {
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
