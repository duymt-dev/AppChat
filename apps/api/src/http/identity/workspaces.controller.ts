// GET /v1/me · POST /v1/workspaces · GET /v1/workspaces/:id/provisioning · GET /v1/business-lookup/tax/:taxCode (Blueprint §4.2).
// Route không cần X-Workspace-Id (§4.1: /v1/me) — chỉ cần access token.
import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { z } from 'zod';
import { TAX_LOOKUP, WorkspacesService } from '@appchat/core';
import type { TaxLookupProvider } from '@appchat/integrations';
import { normalizeTaxCode } from '@appchat/integrations';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';
import { parseBody } from './http-util';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
export class WorkspacesController {
  constructor(
    @Inject(WorkspacesService) private readonly workspaces: WorkspacesService,
    @Inject(TAX_LOOKUP) private readonly tax: TaxLookupProvider,
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
  ) {}

  @Get('me')
  async me(@Req() req: IncomingMessage) {
    return { data: await this.workspaces.me(await this.actors.user(req)) };
  }

  @Post('workspaces')
  @HttpCode(201)
  async create(@Body() raw: unknown, @Req() req: IncomingMessage) {
    const userId = await this.actors.user(req);
    const b = parseBody(z.object({ name: z.string().trim().min(1).max(120) }), raw);
    return { data: { workspace: await this.workspaces.create(userId, b.name) } };
  }

  @Get('workspaces/:id/provisioning')
  async provisioning(@Param('id') id: string, @Req() req: IncomingMessage) {
    const userId = await this.actors.user(req);
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { workspace: 'invalid' });
    return { data: { status: await this.workspaces.provisioning(userId, id) } };
  }

  @Get('business-lookup/tax/:taxCode')
  async taxLookup(@Param('taxCode') taxCode: string, @Req() req: IncomingMessage) {
    await this.actors.user(req);
    if (!normalizeTaxCode(taxCode)) throw new AppError('VALIDATION_FAILED', 422, { tax_code: 'invalid_format' });
    const hit = await this.tax.lookup(taxCode);
    if (!hit) throw new AppError('NOT_FOUND', 404, { tax_code: 'not_found' });
    return { data: hit };
  }
}
