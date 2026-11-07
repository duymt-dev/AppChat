// Đọc số liệu cho HTTP (TIP-038): `GET /v1/insights/:metric` + `GET /v1/agents/:id/stats` — transaction tenant theo membership người xem
// (không quyền hệ thống), cùng registry / service với action `insight.query`.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type AgentStatsDto, type AuthzContext, type InsightResultDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { InsightsService } from '../metrics/registry';
import { agentStats } from './agent-stats';

export interface InsightViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class InsightsReadService {
  constructor(
    @Inject(InsightsService) private readonly insights: InsightsService,
    @Optional() @Inject(TENANT_RESOLVER) private readonly tenants?: TenantDbResolver,
  ) {}

  private async tx<T>(v: InsightViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    if (!this.tenants) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'Tenant DB chưa cấu hình');
    return (await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId))).$transaction(fn);
  }

  metric(v: InsightViewer, metric: string, params: Record<string, unknown>): Promise<InsightResultDto> {
    return this.tx(v, (tx) => this.insights.query(tx, v.authz, v.workspaceId, metric, params));
  }

  /** Thống kê thẻ agent (danh sách / chi tiết): 30 ngày gần nhất theo quyền người xem — cùng service với /agents/:id/stats. */
  async cards(v: InsightViewer, ids: string[]): Promise<Map<string, AgentStatsDto>> {
    if (!ids.length) return new Map();
    const w = await this.insights.window(v.workspaceId, {});
    return this.tx(v, (tx) => agentStats(tx, v.authz, w, ids));
  }

  /** Thống kê một agent trong kỳ — agent lạ / đã xoá → 404. */
  async agent(v: InsightViewer, id: string, p: { from?: string; to?: string }): Promise<AgentStatsDto> {
    const w = await this.insights.window(v.workspaceId, p);
    return this.tx(v, async (tx) => {
      const a = UUID.test(id) ? await tx.aiAgent.findFirst({ where: { id, deletedAt: null }, select: { id: true } }) : null;
      if (!a) throw new AppError('NOT_FOUND', 404, { agent_id: 'not_found' });
      return (await agentStats(tx, v.authz, w, [a.id])).get(a.id)!;
    });
  }
}
