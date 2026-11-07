// GET /v1/contacts/:id/activities?kind=&cursor=&limit=&activity_id= (TIP-026b §3.1): một trang hoạt động CRM một loại — cùng reader với
// action contact_activity.list. crm.view + quyền khách cha HIỆN TẠI mỗi trang; cursor hỏng / lệch loại → 400.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CrmReadService } from '@appchat/core';
import { ACTIVITY_KINDS, AppError, type ActivityKind } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
export class ContactActivitiesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(CrmReadService) private readonly read: CrmReadService,
  ) {}

  @Get('contacts/:id/activities')
  async list(@Req() req: IncomingMessage, @Param('id') id: string, @Query() q: Record<string, string | undefined>) {
    const v = await this.actors.resolve(req);
    if (!v.authz.isOwner && !v.authz.permissions.has('crm.view')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.view' });
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    const kind = q.kind as ActivityKind;
    if (!(ACTIVITY_KINDS as readonly string[]).includes(kind)) throw new AppError('VALIDATION_FAILED', 400, { kind: 'invalid' });
    const limit = q.limit === undefined ? undefined : Number(q.limit);
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) throw new AppError('VALIDATION_FAILED', 400, { limit: 'invalid' });
    if (q.activity_id && (q.cursor || !UUID.test(q.activity_id))) throw new AppError('VALIDATION_FAILED', 400, { activity_id: 'invalid' });
    const page = await this.read.activities(v, id, { kind, cursor: q.cursor, limit, activityId: q.activity_id });
    return { data: page.items, next_cursor: page.next_cursor };
  }
}
