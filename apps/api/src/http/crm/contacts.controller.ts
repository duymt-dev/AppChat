// Đọc Khách hàng (Blueprint §4.4 crm, TIP-015 — shape packages/shared/src/api/crm.ts): /v1/contacts (D42 page + limit),
// /contacts/stats, /contacts/duplicates, /contacts/:id (Hồ sơ 360°), /contacts/:id/collaborators, /contacts/:id/timeline,
// /contact-access-requests, /members, /crm/ai. Quyền `crm.view`; scope crm áp trong service. Ghi qua action contact.*.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CrmMembers, CrmReadService, type ContactFilter } from '@appchat/core';
import { AppError, type PermissionKey } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v: string | undefined, field: string) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};
const truthy = (v: string | undefined) => v === '1' || v === 'true';

@Controller()
export class ContactsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(CrmReadService) private readonly read: CrmReadService,
    @Inject(CrmMembers) private readonly members: CrmMembers,
  ) {}

  private async viewer(req: IncomingMessage, perm: PermissionKey = 'crm.view') {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    return a;
  }

  @Get('contacts')
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    const v = await this.viewer(req);
    const custom = Object.fromEntries(Object.entries(q).filter(([k, x]) => k.startsWith('cf.') && x).map(([k, x]) => [k.slice(3), String(x).slice(0, 100)]));
    const f: ContactFilter = {
      stage: q.stage === 'all' ? undefined : q.stage,
      ownerId: q.owner_id,
      status: q.status,
      group: q.group,
      source: q.source,
      tagId: q.tag_id,
      mine: truthy(q.mine),
      q: q.q?.slice(0, 100),
      custom,
    };
    return this.read.list(v, f, int(q.page, 'page'), int(q.limit, 'limit'));
  }

  @Get('contacts/stats')
  async stats(@Req() req: IncomingMessage) {
    return { data: await this.read.stats(await this.viewer(req)) };
  }

  @Get('contacts/duplicates')
  async duplicates(@Req() req: IncomingMessage) {
    return { data: await this.read.duplicates(await this.viewer(req)) };
  }

  @Get('contacts/:id')
  async one(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get360(await this.viewer(req), id) };
  }

  @Get('contacts/:id/collaborators')
  async collaborators(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.collaborators(await this.viewer(req), id) };
  }

  @Get('contacts/:id/timeline')
  async timeline(@Req() req: IncomingMessage, @Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.read.timeline(await this.viewer(req), id, cursor || undefined);
  }

  @Get('contact-access-requests')
  async access(@Req() req: IncomingMessage, @Query('status') status?: string) {
    return { data: await this.read.accessRequests(await this.viewer(req), status || 'pending') };
  }

  /** Ô chọn người (phụ trách, đồng phụ trách) — thành viên bất kỳ của workspace. */
  @Get('members')
  async memberOptions(@Req() req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    return { data: await this.members.options(a.workspaceId) };
  }

  /** Gợi ý AI của màn Khách hàng là phần AI (TIP-02x) — tới lúc đó rỗng. */
  @Get('crm/ai')
  async ai(@Req() req: IncomingMessage) {
    await this.viewer(req);
    return { data: { runs: {}, peek: [] } };
  }
}
