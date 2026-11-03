// Preview cài đặt Mô hình AI (TIP-023b R2.8, risk config): mức mặc định / mức theo tác vụ / hạn mức credit tháng / token mỗi phút trước /
// sau chỉ phần đổi; tác vụ lạ → 422, mức vượt gói → 402 như execute. Chỉ đọc.
import { AI_TASKS, AppError, tierAllowed, type AiTierKey } from '@appchat/shared';
import type { ActionInput, ActionPreview, aiSettingsUpdate } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import { readAiSetting } from '../ai-settings.service';

export async function aiSettingsPreview(tx: TenantTx, i: ActionInput<typeof aiSettingsUpdate>, planKey: string | null): Promise<ActionPreview> {
  const prev = await readAiSetting(tx);
  const unknown = Object.keys(i.tasks ?? {}).find((k) => !(AI_TASKS as readonly string[]).includes(k));
  if (unknown) throw new AppError('VALIDATION_FAILED', 422, { [`tasks.${unknown}`]: 'unknown' });
  const over = [i.default_tier, ...Object.values(i.tasks ?? {})].filter((x): x is AiTierKey => !!x).find((t) => !tierAllowed(t, planKey));
  if (over) throw new AppError('PLAN_LIMIT_REACHED', 402, { resource: 'ai_tier', tier: over });
  const tasks = i.tasks ? Object.fromEntries(Object.keys(i.tasks).map((k) => [k, prev.tasks[k] ?? null])) : undefined;
  return preview('config', i.default_tier ?? prev.defaultTier, {
    changes: updated('ai_setting', '1', { ...(tasks ? { tasks } : {}), default_tier: prev.defaultTier, budget: prev.budget, rate_limit: prev.rateLimit }, { default_tier: i.default_tier, tasks: i.tasks, budget: i.budget, rate_limit: i.rate_limit }),
  });
}
