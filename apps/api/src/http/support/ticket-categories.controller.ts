// Đọc từ điển gợi ý danh mục ticket (TIP-034b §2.3): `GET /settings/ticket-categories` (settings.manage) — CHỈ bộ cấu hình, không liệt
// kê nhãn đã dùng; `GET /support/category-suggestions?cursor=` (ticket.view) — cấu hình + một trang nhãn đã dùng trong ticket người xem
// thấy (cursor mờ). Quyền cấu hình không vượt scope support. Ghi qua action `ticket_categories.replace`.
import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { TicketCategoriesRead } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

@Controller()
export class TicketCategoriesController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(TicketCategoriesRead) private readonly read: TicketCategoriesRead,
  ) {}

  private async viewer(req: IncomingMessage, perm: 'ticket.view' | 'settings.manage') {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has(perm)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    return a;
  }

  @Get('settings/ticket-categories')
  async config(@Req() req: IncomingMessage) {
    return { data: await this.read.config(await this.viewer(req, 'settings.manage')) };
  }

  @Get('support/category-suggestions')
  async suggestions(@Req() req: IncomingMessage, @Query('cursor') cursor?: string) {
    if (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 500)) throw new AppError('FORBIDDEN', 403, { cursor: 'invalid' });
    return { data: await this.read.suggestions(await this.viewer(req, 'ticket.view'), cursor || undefined) };
  }
}
