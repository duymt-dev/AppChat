// Trạng thái lần lấy lịch sử kênh (TIP-014b C): GET /v1/settings/channels/:id/syncs/:runId — quyền `channels.manage` (route quản lý kênh,
// tách khỏi route thao tác trên tin của Hộp thư). Lần chạy phải thuộc đúng tài khoản; không thấy → 404.
// Đồng bộ danh bạ (TIP-014b D3): GET /v1/settings/channels/:id/contact-syncs/:syncId?cursor= — `channels.manage`; ảnh chụp hết hạn 24 giờ → 404.
// Trạng thái khớp từng dòng chỉ lộ khách người xem thấy theo scope crm (khách người khác → `conflict`, không id).
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TENANT_RESOLVER, CLOCK, crmScopeSql, readContactSync, type Clock } from '@appchat/core';
import { TenantContexts, TenantSql as Prisma, type TenantDbResolver } from '@appchat/db';
import { AppError, type ChannelContactSyncDto, type ChannelHistoryRunDto } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (d: Date | null) => d?.toISOString() ?? null;

@Controller('settings/channels')
export class ChannelSyncController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  @Get(':id/contact-syncs/:syncId')
  async contacts(@Req() req: IncomingMessage, @Param('id') id: string, @Param('syncId') syncId: string, @Query('cursor') cursor?: string): Promise<{ data: ChannelContactSyncDto }> {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('channels.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'channels.manage' });
    if (!UUID.test(id) || !UUID.test(syncId)) throw new AppError('NOT_FOUND', 404, { sync_id: 'not_found' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const after = Number.parseInt(cursor ?? '', 10);
    const data = await db.$transaction((tx) =>
      readContactSync(tx, id, syncId, this.clock.now(), Number.isFinite(after) && after >= 0 ? after : -1, {
        userId: a.userId,
        // Khách thấy được theo scope crm của người xem (không có crm.view → không thấy ai).
        visible: async (ids) => {
          if (!ids.length || (!a.authz.isOwner && !a.authz.permissions.has('crm.view'))) return new Set();
          const rows = await tx.$queryRaw<{ id: string }[]>`SELECT c.id FROM contact c WHERE c.id IN (${Prisma.join(ids.map((x) => Prisma.sql`${x}::uuid`))}) AND c.deleted_at IS NULL AND ${crmScopeSql(a.authz)}`;
          return new Set(rows.map((r) => r.id));
        },
      }),
    );
    if (!data) throw new AppError('NOT_FOUND', 404, { sync_id: 'not_found' });
    return { data };
  }

  @Get(':id/syncs/:runId')
  async get(@Req() req: IncomingMessage, @Param('id') id: string, @Param('runId') runId: string): Promise<{ data: ChannelHistoryRunDto }> {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('channels.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'channels.manage' });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    const r = UUID.test(runId) ? await db.channelHistoryRun.findUnique({ where: { id: runId } }) : null;
    if (!r || r.channelAccountId !== id) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
    return {
      data: {
        id: r.id,
        channel_account_id: r.channelAccountId,
        days: r.days,
        cutoff_at: r.cutoffAt.toISOString(),
        state: r.status as ChannelHistoryRunDto['state'],
        received: r.received,
        in_range: r.inRange,
        imported: r.imported,
        pages: r.pages,
        earliest_at: iso(r.earliestAt),
        latest_at: iso(r.latestAt),
        error: r.error,
        created_at: r.createdAt.toISOString(),
        finished_at: iso(r.finishedAt),
      },
    };
  }
}
