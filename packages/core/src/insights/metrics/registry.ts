// Registry metric (Blueprint §3.4 insights, TIP-038 mục 1): allowlist `METRIC_KEYS` → hàm đọc. Một service cho `GET /v1/insights/:metric`,
// action `insight.query` và Trợ lý `query_data` (qua ActionExecutor) → cùng params thì cùng rows / sources / window. Metric lạ → 422; không
// nhận SQL / tên bảng / cột. Múi giờ = `workspace.timezone` (nền tảng). Không cache (số liệu theo scope người xem — không có khoá dùng chung an toàn).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformDb } from '@appchat/db';
import { AppError, INSIGHT_LIMITS, addDays, isMetricKey, utcToWall, type AuthzContext, type InsightResultDto, type MetricKey } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { CLOCK, type Clock } from '../../kernel/clock';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { agentsPerformance } from './agents';
import { parseParams, resolveWindow, type MetricBody, type MetricCtx, type MetricWindow } from './common';
import { customersAtRisk } from './customers';
import { salesBooked, salesCollected } from './sales';
import { supportPerformance } from './support';

interface MetricDef {
  bucketed: boolean;
  run(c: MetricCtx, p: Record<string, unknown>): Promise<MetricBody>;
}

const METRICS: Record<MetricKey, MetricDef> = {
  'sales.booked': { bucketed: true, run: (c) => salesBooked(c) },
  'sales.collected': { bucketed: true, run: (c) => salesCollected(c) },
  'customers.at_risk': { bucketed: false, run: (c, p) => customersAtRisk(c, (p.limit as number | undefined) ?? INSIGHT_LIMITS.atRiskDefault) },
  'agents.performance': { bucketed: false, run: (c, p) => agentsPerformance(c, p.agent_id as string | undefined) },
  'support.performance': { bucketed: true, run: (c) => supportPerformance(c) },
};

/** Cửa sổ của metric: khách sắp rời = `days` ngày gần nhất tính tới hết hôm nay; còn lại from / to người gọi. */
function windowOf(metric: MetricKey, p: Record<string, unknown>, tz: string, now: Date): MetricWindow {
  if (metric !== 'customers.at_risk') return resolveWindow(p, tz, now, METRICS[metric].bucketed);
  const to = addDays(utcToWall(now, tz).date, 1);
  return resolveWindow({ from: addDays(to, -((p.days as number | undefined) ?? INSIGHT_LIMITS.defaultDays)), to }, tz, now, false);
}

@Injectable()
export class InsightsService {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb,
  ) {}

  async timezone(workspaceId: string): Promise<string> {
    const w = this.platform ? await this.platform.workspace.findUnique({ where: { id: workspaceId }, select: { timezone: true } }) : null;
    return w?.timezone ?? 'Asia/Ho_Chi_Minh';
  }

  /** Cửa sổ ngày (from / to tuỳ chọn) theo múi workspace — dùng chung cho thống kê agent. */
  async window(workspaceId: string, p: { from?: string; to?: string }): Promise<MetricWindow> {
    return resolveWindow(parseParams('agents.performance', { ...(p.from ? { from: p.from } : {}), ...(p.to ? { to: p.to } : {}) }), await this.timezone(workspaceId), this.clock.now(), false);
  }

  async query(tx: TenantTx, authz: AuthzContext, workspaceId: string, metric: string, raw: unknown): Promise<InsightResultDto> {
    if (!isMetricKey(metric)) throw new AppError('VALIDATION_FAILED', 422, { metric: 'unknown_metric' });
    const params = parseParams(metric, raw);
    const now = this.clock.now();
    const window = windowOf(metric, params, await this.timezone(workspaceId), now);
    const body = await METRICS[metric].run({ tx, authz, window, now }, params);
    return {
      metric,
      params,
      window: { from: window.from, to: window.to, timezone: window.timezone, ...(window.bucket ? { bucket: window.bucket } : {}) },
      as_of: now.toISOString(),
      ...body,
      rows: body.rows.slice(0, INSIGHT_LIMITS.maxRows),
    };
  }
}
