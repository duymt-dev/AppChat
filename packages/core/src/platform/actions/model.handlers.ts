// admin.model_price.upsert + admin.model_route.upsert (TIP-040 pha 2, DC-370). Đơn giá Decimal(12,4) theo (provider, model), CAS
// `if_version`; route = THAY CẢ NHÓM (tier, purpose) trong một transaction theo thứ tự gửi (priority 0..n-1 — không va priority), CAS
// theo phiên bản nhóm `route:<tier>:<purpose>`. Mỗi thay đổi tăng thế hệ cấu hình `ai` cùng transaction → mọi tiến trình nạp lại.
// Tắt giá đang được route dùng → 422 (route không giá = không chạy, không fallback 0 credit). Tên model chỉ ở đây (D29).
import { Injectable } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, adminModelPriceUpsert, adminModelRouteUpsert } from '@appchat/actions';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { ActionHandler } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { PlatformActionHandler, type AdminOutcome, type PlatformContext } from '../../kernel/actions/platform-context';
import { AI_CONFIG_SCOPE, bumpRevision, routeScope } from '../services/config-revision';
import { casConflict, requireVersion, validateRoutes } from '../services/config-validation';

type PriceIn = ActionInput<typeof adminModelPriceUpsert>;
type PriceOut = { provider_key: string; model: string; version: number; created: boolean };
type RouteIn = ActionInput<typeof adminModelRouteUpsert>;
type RouteOut = { tier: RouteIn['tier']; purpose: RouteIn['purpose']; version: number; count: number };

const priceView = (p: { tier: string; creditsPer1kIn: unknown; creditsPer1kOut: unknown; active: boolean }) => ({
  tier: p.tier,
  credits_per_1k_in: String(p.creditsPer1kIn),
  credits_per_1k_out: String(p.creditsPer1kOut),
  active: p.active,
});

async function usedByRoute(db: Pick<PlatformDb, 'modelRoute'>, providerKey: string, model: string) {
  return db.modelRoute.count({ where: { providerKey, model } });
}

@Injectable()
@ActionHandler('admin.model_price.upsert')
export class AdminModelPriceUpsertHandler extends PlatformActionHandler<PriceIn, PriceOut> {
  async executePlatform(_ctx: PlatformContext, i: PriceIn, ptx: PlatformTx): Promise<AdminOutcome<PriceOut>> {
    const where = { providerKey_model: { providerKey: i.provider_key, model: i.model } };
    // Thế hệ trước (khoá dòng revision) — hai admin cùng sửa giá xếp hàng, CAS bên dưới quyết định ai thắng.
    await bumpRevision(ptx, AI_CONFIG_SCOPE, new Date());
    const cur = await ptx.modelPrice.findUnique({ where });
    const values = { tier: i.tier, creditsPer1kIn: i.credits_per_1k_in, creditsPer1kOut: i.credits_per_1k_out, active: i.active };
    if (!i.active && (await usedByRoute(ptx, i.provider_key, i.model))) throw new AppError('VALIDATION_FAILED', 422, { active: 'used_by_route' });
    if (!cur) {
      if (i.if_version !== undefined) throw new AppError('NOT_FOUND', 404, { model: 'not_found' });
      if (!(await ptx.llmProvider.findUnique({ where: { key: i.provider_key }, select: { key: true } }))) throw new AppError('VALIDATION_FAILED', 422, { provider_key: 'not_found' });
      const row = await ptx.modelPrice.create({ data: { providerKey: i.provider_key, model: i.model, ...values } });
      return { result: { provider_key: row.providerKey, model: row.model, version: row.version, created: true }, after: priceView(row) };
    }
    requireVersion(i.if_version, cur.version);
    const n = await ptx.modelPrice.updateMany({ where: { providerKey: i.provider_key, model: i.model, version: cur.version }, data: { ...values, version: { increment: 1 } } });
    if (!n.count) throw casConflict(cur.version);
    const row = await ptx.modelPrice.findUniqueOrThrow({ where });
    return { result: { provider_key: row.providerKey, model: row.model, version: row.version, created: false }, before: priceView(cur), after: priceView(row) };
  }

  async previewPlatform(_ctx: PlatformContext, i: PriceIn, db: PlatformDb) {
    const cur = await db.modelPrice.findUnique({ where: { providerKey_model: { providerKey: i.provider_key, model: i.model } } });
    const used = await usedByRoute(db, i.provider_key, i.model);
    return {
      summary: `${i.provider_key} · ${i.model}`,
      risk: 'config' as const,
      changes: [{ entity: 'model_price', id: `${i.provider_key}:${i.model}`, ...(cur ? { before: priceView(cur) } : {}), after: { tier: i.tier, credits_per_1k_in: i.credits_per_1k_in, credits_per_1k_out: i.credits_per_1k_out, active: i.active } }],
      warnings: [...(used ? [`routes:${used}`] : []), ...(!i.active && used ? ['used_by_route'] : [])],
    };
  }
}

@Injectable()
@ActionHandler('admin.model_route.upsert')
export class AdminModelRouteUpsertHandler extends PlatformActionHandler<RouteIn, RouteOut> {
  async executePlatform(_ctx: PlatformContext, i: RouteIn, ptx: PlatformTx): Promise<AdminOutcome<RouteOut>> {
    const scope = routeScope(i.tier, i.purpose);
    const now = new Date();
    // Tăng + khoá phiên bản nhóm trước khi đọc: hai admin sắp xếp cùng nhóm xếp hàng ở dòng này → bên sau thấy phiên bản đã đổi → 409.
    const next = await bumpRevision(ptx, scope, now);
    if (Number(next - 1n) !== i.if_version) throw casConflict(Number(next - 1n));
    if (i.purpose === 'chat' && !i.routes.length) throw new AppError('VALIDATION_FAILED', 422, { routes: 'required' });
    const fields = await validateRoutes(ptx, i.purpose, i.routes);
    if (Object.keys(fields).length) throw new AppError('VALIDATION_FAILED', 422, fields);
    const old = await ptx.modelRoute.findMany({ where: { tier: i.tier, purpose: i.purpose }, orderBy: { priority: 'asc' } });
    await ptx.modelRoute.deleteMany({ where: { tier: i.tier, purpose: i.purpose } });
    if (i.routes.length)
      // Cờ vision vào params (cùng revision cấu hình AI — 023e); chỉ route chat mới mang ảnh.
      await ptx.modelRoute.createMany({ data: i.routes.map((r, priority) => ({ id: uuidv7(), tier: i.tier, purpose: i.purpose, priority, providerKey: r.provider_key, model: r.model, ...(r.vision && i.purpose === 'chat' ? { params: { vision: true } } : {}) })) });
    await bumpRevision(ptx, AI_CONFIG_SCOPE, now);
    return {
      result: { tier: i.tier, purpose: i.purpose, version: Number(next), count: i.routes.length },
      before: { routes: old.map((r) => ({ provider_key: r.providerKey, model: r.model, vision: (r.params as { vision?: unknown } | null)?.vision === true })) },
      after: { routes: i.routes },
    };
  }

  async previewPlatform(_ctx: PlatformContext, i: RouteIn, db: PlatformDb) {
    const old = await db.modelRoute.findMany({ where: { tier: i.tier, purpose: i.purpose }, orderBy: { priority: 'asc' } });
    return {
      summary: `${i.tier} · ${i.purpose} · ${i.routes.length}`,
      risk: 'config' as const,
      changes: [{ entity: 'model_route', id: `${i.tier}:${i.purpose}`, before: { routes: old.map((r) => `${r.providerKey}:${r.model}`) }, after: { routes: i.routes.map((r) => `${r.provider_key}:${r.model}${r.vision ? ' (vision)' : ''}`) } }],
      warnings: i.routes.length ? [] : ['empty_group'],
    };
  }
}
