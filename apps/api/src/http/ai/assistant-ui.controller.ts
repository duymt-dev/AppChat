// Tài nguyên phụ của giao diện Trợ lý (TIP-023c): GET /v1/assistant/ui/qr/:accountId?attempt= — ảnh QR của ĐÚNG lần đăng nhập đang chờ
// quét cho khối `qr` (không qua model / lịch sử; lần cũ / đã quét / hết hạn → 404). Quyền `channels.manage` + thành viên hiện hành.
// POST /v1/assistant/ui/refs — đọc lại giá trị `$ref` của một cây đã lưu theo quyền hiện hành (mở lại phiên / đổi workspace).
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { z } from 'zod';
import { AssistantService, ChannelsReadService, RequestContext, TENANT_RESOLVER } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { parseBody } from '../identity/http-util';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const refsBody = z.object({ run_id: z.string().uuid(), refs: z.array(z.string().max(200)).max(60) });

@Controller('assistant/ui')
export class AssistantUiController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(ChannelsReadService) private readonly channels: ChannelsReadService | null,
    @Inject(AssistantService) private readonly svc: AssistantService,
    @Inject(TENANT_RESOLVER) private readonly tenants: TenantDbResolver,
  ) {}

  @Get('qr/:accountId')
  async qr(@Req() req: IncomingMessage, @Param('accountId') accountId: string, @Query('attempt') attempt?: string) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('channels.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'channels.manage' });
    if (!this.channels) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'channels chưa cấu hình');
    RequestContext.patch({ ws: a.workspaceId, userId: a.userId });
    const db = await this.tenants.get(TenantContexts.fromMembership(a.workspaceId, a.userId));
    return { data: await this.channels.loginQr(db, accountId, (attempt ?? '').slice(0, 80)) };
  }

  @Post('refs')
  @HttpCode(200)
  async refs(@Req() req: IncomingMessage, @Body() body: unknown) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('assistant.use')) throw new AppError('FORBIDDEN', 403, { permission: 'assistant.use' });
    RequestContext.patch({ ws: a.workspaceId, userId: a.userId });
    const b = parseBody(refsBody, body);
    return { data: await this.svc.refs(a, b.run_id, b.refs) };
  }
}
