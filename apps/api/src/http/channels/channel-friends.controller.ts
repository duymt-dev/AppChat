// Bạn bè Zalo (TIP-014b E): GET /v1/settings/channels/:id/friends?state=incoming (lời mời tới, mới nhất trước, ≤ 50) · /friends/:externalId
// (trạng thái + lệnh gần nhất) · /lookups/:lookupId (kết quả tra SĐT — chỉ người tra / Owner, hạn 24 giờ, quá hạn → 404). Quyền: `inbox.reply`
// (xem lời mời) / `inbox.manage` (tra). Không trả SĐT người khác tra; không trả nội dung ngoài tên + id phía kênh.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CLOCK, TENANT_RESOLVER, type Clock } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type ChannelFriendDto, type ChannelLookupDto } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT = /^[0-9]{1,20}$/;
const iso = (d: Date | null) => d?.toISOString() ?? null;

type FriendRow = { externalId: string; displayName: string; state: string; incomingMessage: string | null; incomingAt: Date | null; op: string | null; opStatus: string | null; opError: string | null };
const dto = (f: FriendRow): ChannelFriendDto => ({
  external_id: f.externalId,
  name: f.displayName || f.externalId,
  state: f.state as ChannelFriendDto['state'],
  incoming_message: f.incomingMessage,
  incoming_at: iso(f.incomingAt),
  op: (f.op as ChannelFriendDto['op']) ?? null,
  op_status: (f.opStatus === 'dispatch_reserved' ? 'queued' : f.opStatus) as ChannelFriendDto['op_status'],
  op_error: f.opError,
});

@Controller('settings/channels')
export class ChannelFriendsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private async db(req: IncomingMessage, perm: 'inbox.reply' | 'inbox.manage') {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    return { a, db: await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId)) };
  }

  @Get(':id/friends')
  async list(@Req() req: IncomingMessage, @Param('id') id: string, @Query('state') state?: string): Promise<{ data: ChannelFriendDto[] }> {
    const { db } = await this.db(req, 'inbox.reply');
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { channel_account_id: 'not_found' });
    // Index partial `channel_friend_incoming_idx` (tài khoản =, incoming_at DESC).
    const rows = await db.channelFriend.findMany({ where: { channelAccountId: id, state: state === 'incoming' || !state ? 'incoming' : state }, orderBy: { incomingAt: 'desc' }, take: 50 });
    return { data: rows.map(dto) };
  }

  @Get(':id/friends/:externalId')
  async one(@Req() req: IncomingMessage, @Param('id') id: string, @Param('externalId') ext: string): Promise<{ data: ChannelFriendDto }> {
    const { db } = await this.db(req, 'inbox.reply');
    if (!UUID.test(id) || !EXT.test(ext)) throw new AppError('NOT_FOUND', 404, { external_id: 'not_found' });
    const f = await db.channelFriend.findUnique({ where: { channelAccountId_externalId: { channelAccountId: id, externalId: ext } } });
    return { data: f ? dto(f) : dto({ externalId: ext, displayName: '', state: 'none', incomingMessage: null, incomingAt: null, op: null, opStatus: null, opError: null }) };
  }

  @Get(':id/lookups/:lookupId')
  async lookup(@Req() req: IncomingMessage, @Param('id') id: string, @Param('lookupId') lookupId: string): Promise<{ data: ChannelLookupDto }> {
    const { a, db } = await this.db(req, 'inbox.manage');
    const r = UUID.test(lookupId) ? await db.channelUserLookup.findUnique({ where: { id: lookupId } }) : null;
    // Chỉ người tra (hoặc Owner) thấy kết quả; quá 24 giờ → như không tồn tại.
    if (!r || r.channelAccountId !== id || r.expiresAt <= this.clock.now() || (r.actorId !== a.userId && !a.authz.isOwner)) throw new AppError('NOT_FOUND', 404, { lookup_id: 'not_found' });
    return {
      data: {
        id: r.id,
        channel_account_id: r.channelAccountId,
        phone: r.phone,
        state: r.status as ChannelLookupDto['state'],
        external_id: r.externalId,
        name: r.displayName,
        error: r.error,
        created_at: r.createdAt.toISOString(),
        expires_at: r.expiresAt.toISOString(),
      },
    };
  }
}
