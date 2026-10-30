// GET /v1/billing/summary · /plans · /wallet · /ledger?cursor= (Blueprint §4.4 billing) — thành viên workspace (X-Workspace-Id);
// ghi (mua gói / nạp credit / cảnh báo ví) là action của TIP-010 / 039. Lịch sử ví render theo locale người xem.
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { BillingReadService, PLATFORM_DB } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller('billing')
export class BillingController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(BillingReadService) private readonly read: BillingReadService,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
  ) {}

  private async locale(userId: string) {
    return (await this.platform.user.findUnique({ where: { id: userId }, select: { locale: true } }))?.locale ?? 'vi';
  }

  @Get('summary')
  async summary(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.read.summary(a.workspaceId) };
  }

  @Get('plans')
  async plans(@Req() req: IncomingMessage) {
    await this.actors.resolve(req);
    return { data: await this.read.catalog() };
  }

  @Get('wallet')
  async wallet(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.read.wallet(a.workspaceId, await this.locale(a.userId)) };
  }

  @Get('ledger')
  async ledger(@Req() req: IncomingMessage, @Query('cursor') cursor?: string, @Query('limit') limit?: string) {
    const a = await this.actors.resolve(req);
    const n = limit === undefined ? undefined : Number(limit);
    if (n !== undefined && !Number.isInteger(n)) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    return this.read.ledger(a.workspaceId, await this.locale(a.userId), cursor || undefined, n);
  }
}
