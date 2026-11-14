// loyalty.update_config (TIP-036, COMMERCE §7): chỉ bật / tắt chương trình, hệ số từng hạng (đủ 4 hạng, mỗi hạng một lần), đơn sàn có tích
// điểm. Tỉ lệ 10.000đ / 100đ, trần 50%, hạn 12 tháng, ngưỡng hạng là luật — không đổi qua action. Đổi hệ số chỉ ảnh hưởng đơn hoàn tất sau
// (căn cứ tích chụp vào sổ lúc tích). Không hoàn tác (risk config — preview trước).
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError, TIER_KEYS, type LoyaltyTier } from '@appchat/shared';
import type { ActionInput, ActionPreview, loyaltyUpdateConfig } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { CLOCK, SystemClock, type Clock } from '../../kernel/clock';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { defined, line, preview, updated } from '../../kernel/actions/preview-kit';
import { readConfig } from '../services/config.service';

type In = ActionInput<typeof loyaltyUpdateConfig>;

function nextTiers(cur: LoyaltyTier[], patch: In['tiers']): LoyaltyTier[] | undefined {
  if (!patch) return undefined;
  const keys = patch.map((t) => t.key);
  if (new Set(keys).size !== TIER_KEYS.length || !TIER_KEYS.every((k) => keys.includes(k))) throw new AppError('VALIDATION_FAILED', 422, { tiers: 'four_unique' });
  return cur.map((t) => ({ ...t, mult: patch.find((x) => x.key === t.key)!.mult }));
}

const view = (c: { enabled: boolean; marketplaceEarn: boolean; tiers: LoyaltyTier[] }) => ({ enabled: c.enabled, marketplace_earn: c.marketplaceEarn, tiers: c.tiers.map((t) => `${t.key}×${t.mult}`).join(' ') });

const defaultClock = new SystemClock();

@Injectable()
@ActionHandler('loyalty.update_config')
export class LoyaltyUpdateConfigHandler implements Handler<In, { ok: boolean }> {
  constructor(@Optional() @Inject(CLOCK) private readonly clock: Clock = defaultClock) {}

  async execute(_ctx: ActionContext, i: In, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    await tx.$queryRaw`SELECT 1 FROM loyalty_config WHERE id = 1 FOR UPDATE`;
    const cur = await readConfig(tx);
    const tiers = nextTiers(cur.tiers, i.tiers);
    const data = defined({ enabled: i.enabled, marketplaceEarn: i.marketplace_earn, tiers: tiers as never });
    if (!Object.keys(data).length) return { result: { ok: true } };
    await tx.loyaltyConfig.update({ where: { id: 1 }, data: { ...data, version: { increment: 1 }, updatedAt: this.clock.now() } });
    return {
      result: { ok: true },
      before: view(cur),
      events: [{ topic: 'loyalty.config_changed', payload: { version: cur.version + 1, ...defined({ enabled: i.enabled, marketplace_earn: i.marketplace_earn }), ...(tiers ? { tiers: tiers.map((t) => ({ key: t.key, mult: t.mult })) } : {}) } }],
    };
  }

  async preview(_ctx: ActionContext, i: In, tx: TenantTx): Promise<ActionPreview> {
    const cur = await readConfig(tx);
    const tiers = nextTiers(cur.tiers, i.tiers);
    const next = { enabled: i.enabled ?? cur.enabled, marketplaceEarn: i.marketplace_earn ?? cur.marketplaceEarn, tiers: tiers ?? cur.tiers };
    return preview('config', line('loyalty_config', `v${cur.version}`), { changes: updated('loyalty_config', '1', view(cur), view(next)) });
  }
}
