// Trạng thái lần lấy lịch sử kênh (TIP-014b C): GET /v1/settings/channels/:id/syncs/:runId — quyền `channels.manage` (route quản lý kênh,
// tách khỏi route thao tác trên tin của Hộp thư). Lần chạy phải thuộc đúng tài khoản; không thấy → 404.
import { Controller, Get, Inject, Param, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TENANT_RESOLVER } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type ChannelHistoryRunDto } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (d: Date | null) => d?.toISOString() ?? null;

@Controller('settings/channels')
export class ChannelSyncController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
  ) {}

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
