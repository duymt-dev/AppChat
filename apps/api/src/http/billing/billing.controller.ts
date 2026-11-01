// GET /v1/billing/summary · /plans · /wallet · /ledger?cursor= (Blueprint §4.4 billing) — thành viên workspace (X-Workspace-Id);
// TIP-010: /invoices?status=&q=, /invoices/:id (`billing.manage`). Ghi là action billing.* (TIP-010 / 039). Chữ render theo locale người xem.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { BillingReadService, InvoicesService, PLATFORM_DB } from '@appchat/core';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('billing')
export class BillingController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(BillingReadService) private readonly read: BillingReadService,
    @Inject(PLATFORM_DB) private readonly platform: PlatformDb,
    @Inject(InvoicesService) private readonly invoices: InvoicesService,
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

  private async manager(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('billing.manage')) throw new AppError('FORBIDDEN', 403, { permission: 'billing.manage' });
    return a;
  }

  @Get('invoices')
  async list(@Req() req: IncomingMessage, @Query('status') status?: string, @Query('q') q?: string) {
    const a = await this.manager(req);
    return this.invoices.list(a.workspaceId, await this.locale(a.userId), { status, q: q?.slice(0, 100) });
  }

  @Get('invoices/:id')
  async one(@Req() req: IncomingMessage, @Param('id') id: string) {
    const a = await this.manager(req);
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { invoice_id: 'not_found' });
    return { data: await this.invoices.get(a.workspaceId, await this.locale(a.userId), id) };
  }
}
