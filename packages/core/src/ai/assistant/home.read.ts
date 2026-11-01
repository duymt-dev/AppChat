// Màn chào Trợ lý (`GET /assistant/home` — prototype L1178–1260): 5 thẻ "tư duy" (Chat) + câu gợi ý theo locale (chữ server), thẻ
// agent cho Cowork = AI Agent thật của workspace (đã xuất bản, chưa xoá — đang chạy / tạm dừng), màu / icon theo vai trò như prototype.
import type { TenantDb } from '@appchat/db';
import { serverMessages, type AssistantHomeDto } from '@appchat/shared';

const THINK_LOOK = [
  { color: '#DB2777', icon: 'ic-spark' },
  { color: '#2563EB', icon: 'ic-cal' },
  { color: '#0E9B94', icon: 'ic-chart' },
  { color: '#C9820B', icon: 'ic-doc' },
  { color: '#6E48E6', icon: 'ic-flow' },
];

/** Màu / icon thẻ agent theo vai trò (prototype `cowork_cards`). */
const ROLE_LOOK: Record<string, { color: string; icon: string }> = {
  sales: { color: '#1F9C4F', icon: 'ic-trend' },
  cs: { color: '#C9820B', icon: 'ic-inbox' },
  marketing: { color: '#DB2777', icon: 'ic-mega' },
  booking: { color: '#2563EB', icon: 'ic-cal' },
  accounting: { color: '#0E9B94', icon: 'ic-doc' },
  ops: { color: '#6E48E6', icon: 'ic-bolt' },
};
const CUSTOM_LOOK = { color: '#0E9B7E', icon: 'ic-bot' };
const COWORK_LIMIT = 12;
const TIERS = ['standard', 'advanced', 'max'] as const;

export async function assistantHome(db: Pick<TenantDb, 'aiAgent'>, locale: string): Promise<AssistantHomeDto> {
  const m = serverMessages(locale).ai.assistant;
  const agents = await db.aiAgent.findMany({
    where: { deletedAt: null, publishedVersion: { gt: 0 }, status: { in: ['active', 'paused'] } },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take: COWORK_LIMIT,
    select: { id: true, name: true, role: true, roleLabel: true, persona: true, modelTier: true, status: true },
  });
  return {
    think_cards: m.think.map((c, i) => ({ ...c, ...THINK_LOOK[i % THINK_LOOK.length]! })),
    cowork_cards: agents.map((a) => ({
      id: a.id,
      name: a.name,
      desc: (a.roleLabel || a.persona).slice(0, 160),
      model_tier: (TIERS as readonly string[]).includes(a.modelTier) ? (a.modelTier as (typeof TIERS)[number]) : 'standard',
      status: a.status === 'paused' ? 'paused' : 'active',
      ...(ROLE_LOOK[a.role] ?? CUSTOM_LOOK),
    })),
    prompts: [...m.prompts],
  };
}
