// Đọc Ticket (Blueprint §4.4 support, TIP-034 — shape packages/shared/src/api/tickets.ts): /v1/tickets?status=&priority=&team=&category=&
// assignee=&sla=&q=&sort=&cf.*&page=&limit= (D42), /tickets/meta, /tickets/:id, /settings/sla (chính sách SLA thật — thay bản mặc định của TIP-013). Quyền `ticket.view`; data scope support trong service
// (không thấy → 404). Ghi qua action ticket.*.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TicketsReadService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v?: string) => (v && /^\d{1,5}$/.test(v) ? Number(v) : undefined);

@Controller()
export class TicketsController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TicketsReadService) private readonly read: TicketsReadService,
  ) {}

  private async viewer(req: IncomingMessage, perm: 'ticket.view' | 'sla.manage' = 'ticket.view') {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    return a;
  }

  @Get('tickets')
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    const custom = Object.fromEntries(Object.entries(q).filter(([k, x]) => k.startsWith('cf.') && x).map(([k, x]) => [k.slice(3), String(x).slice(0, 100)]));
    const f = { status: q.status, priority: q.priority, team: q.team, category: q.category, assignee: q.assignee, sla: q.sla, sort: q.sort, q: q.q?.slice(0, 100), custom };
    return this.read.list(await this.viewer(req), f, int(q.page), int(q.limit));
  }

  @Get('tickets/meta')
  async meta(@Req() req: IncomingMessage) {
    return { data: await this.read.meta(await this.viewer(req)) };
  }

  @Get('tickets/:id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get(await this.viewer(req), id) };
  }

  /** Cài đặt › SLA: chính sách mặc định + giờ làm việc + leo thang + dự báo rủi ro (`sla.manage`). */
  @Get('settings/sla')
  async sla(@Req() req: IncomingMessage) {
    return { data: await this.read.slaSettings(await this.viewer(req, 'sla.manage')) };
  }
}
