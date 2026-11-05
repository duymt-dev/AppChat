// `ai_settings.update` (TIP-019, Cài đặt › Mô hình AI): mức mặc định / mức theo tác vụ / hạn mức credit tháng / token mỗi phút.
// Mức vượt gói (catalog "Mức AI") → 402 PLAN_LIMIT_REACHED `{ resource: ai_tier }` (FE mở Gói & thanh toán).
import { Inject, Injectable } from '@nestjs/common';
import { AI_TASKS, AppError, tierAllowed, type AiTierKey } from '@appchat/shared';
import type { ActionInput, aiSettingsUpdate } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { QuotaService } from '../../billing/public';
import { readAiSetting, type AiSettingRow } from './ai-settings.service';
import { aiSettingsPreview } from './previews/ai-settings.handlers.preview';

type In = ActionInput<typeof aiSettingsUpdate>;
const snap = (s: AiSettingRow) => ({ default_tier: s.defaultTier, tasks: s.tasks, budget: s.budget, rate_limit: s.rateLimit });

async function write(tx: TenantTx, s: AiSettingRow) {
  const data = { defaultTier: s.defaultTier, tasks: s.tasks, budget: s.budget, rateLimit: s.rateLimit };
  await tx.aiSetting.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
}

@Injectable()
@ActionHandler('ai_settings.update')
export class AiSettingsUpdateHandler implements Handler<In, { ok: boolean }> {
  constructor(@Inject(QuotaService) private readonly quota: QuotaService | null) {}

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const prev = await readAiSetting(tx);
    const tasks = { ...prev.tasks };
    for (const [k, v] of Object.entries(input.tasks ?? {})) {
      if (!(AI_TASKS as readonly string[]).includes(k)) throw new AppError('VALIDATION_FAILED', 422, { [`tasks.${k}`]: 'unknown' });
      tasks[k] = v;
    }
    const next: AiSettingRow = { defaultTier: input.default_tier ?? prev.defaultTier, tasks, budget: input.budget ?? prev.budget, rateLimit: input.rate_limit ?? prev.rateLimit };
    const planKey = this.quota ? (await this.quota.limits(ctx.workspaceId)).planKey : null;
    const asked = [input.default_tier, ...Object.values(input.tasks ?? {})].filter((x): x is AiTierKey => !!x);
    const over = asked.find((t) => !tierAllowed(t, planKey));
    if (over) throw new AppError('PLAN_LIMIT_REACHED', 402, { resource: 'ai_tier', tier: over });
    await write(tx, next);
    return { result: { ok: true }, before: snap(prev), after: snap(next) };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return aiSettingsPreview(tx, input, this.quota ? (await this.quota.limits(ctx.workspaceId)).planKey : null);
  }
}
