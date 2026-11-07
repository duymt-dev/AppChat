// Cài đặt › Mô hình AI (TIP-019; FE `features/settings/types.ts` AiSettings — schema `aiSettingsSchema` @appchat/shared):
// 3 mức AI (tên model ẩn — D29), mức khoá theo gói (catalog "Mức AI"), credit / 1k token theo `model_price` rẻ nhất của mức,
// mức mặc định + mức theo tác vụ + hạn mức credit / tháng + giới hạn token / phút từ `ai_setting` (một dòng). Ghi: `ai_settings.update`.
import type { TenantDb } from '@appchat/db';
import { AI_TASKS, AI_TASK_DEFAULT_TIER, AI_TIERS, tierAllowed, type AiSettingsDto, type AiTierKey } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export const DEFAULT_RATE_LIMIT = 10_000;
/** Credit / 1k token hiển thị khi chưa có đơn giá (chưa cấu hình provider) — tỉ lệ theo prototype. */
const FALLBACK_CREDITS: Record<AiTierKey, number> = { standard: 1, advanced: 4, max: 15 };

export interface AiSettingRow {
  defaultTier: AiTierKey;
  tasks: Record<string, AiTierKey>;
  budget: number;
  rateLimit: number;
}

type Db = Pick<TenantDb, 'aiSetting'> | Pick<TenantTx, 'aiSetting'>;

export async function readAiSetting(db: Db): Promise<AiSettingRow> {
  const r = await db.aiSetting.findUnique({ where: { id: 1 } });
  return {
    defaultTier: (AI_TIERS as readonly string[]).includes(r?.defaultTier ?? '') ? (r!.defaultTier as AiTierKey) : 'standard',
    tasks: (r?.tasks ?? {}) as Record<string, AiTierKey>,
    budget: r?.budget ?? 0,
    rateLimit: r?.rateLimit ?? DEFAULT_RATE_LIMIT,
  };
}

/** Mức AI cho một tác vụ (copilot / auto_reply / …): theo cài đặt, hạ về mức cao nhất của gói nếu gói đã đổi xuống. */
export function tierFor(s: AiSettingRow, task: string | null, planKey: string): AiTierKey {
  const want = (task && s.tasks[task]) || (task && AI_TASK_DEFAULT_TIER[task as keyof typeof AI_TASK_DEFAULT_TIER]) || s.defaultTier;
  for (let i = AI_TIERS.indexOf(want); i >= 0; i--) if (tierAllowed(AI_TIERS[i]!, planKey)) return AI_TIERS[i]!;
  return 'standard';
}

const fmtCredits = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')).replace('.', ',');

export function aiSettingsDto(s: AiSettingRow, planKey: string, credits: Partial<Record<AiTierKey, number>>): AiSettingsDto {
  return {
    default_tier: s.defaultTier,
    tiers: AI_TIERS.map((key) => {
      const locked = !tierAllowed(key, planKey);
      return {
        key,
        credits: fmtCredits(credits[key] ?? FALLBACK_CREDITS[key]),
        badge: key === s.defaultTier ? ('using' as const) : key === 'advanced' && !locked ? ('hot' as const) : ('' as const),
        active: !locked,
        locked,
      };
    }),
    tasks: AI_TASKS.map((key) => ({ key, tier: s.tasks[key] ?? AI_TASK_DEFAULT_TIER[key] })),
    budget: s.budget,
    rate_limit: s.rateLimit,
  };
}
