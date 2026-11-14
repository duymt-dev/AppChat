// Đọc Đơn hàng (Blueprint §4.4 sales, TIP-031 — shape packages/shared/src/api/orders.ts): /v1/orders (D42 page + limit, chip `chip`
// (all | paid | deposit | pending | cancelled) / `owner_id` / `contact_id` / `value` (lt5 | 5to20 | gt20) / `source` / `q` không dấu /
// `cf.*`), /orders/meta (?order_id= kèm thẻ CRM / nhận định của đơn đó), /orders/:id. Quyền `order.view`; data scope sales trong service
// (không thấy → 404). Ghi qua action order.*.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { OrdersReadService, type OrderFilter } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const int = (v: string | undefined, field: string) => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('VALIDATION_FAILED', 400, { [field]: 'invalid' });
  return n;
};

export function orderFilterOf(q: Record<string, string | undefined>): OrderFilter {
  const custom = Object.fromEntries(Object.entries(q).filter(([k, x]) => k.startsWith('cf.') && x).map(([k, x]) => [k.slice(3), String(x).slice(0, 100)]));
  return { chip: q.chip, ownerId: q.owner_id, assignedId: q.assigned_user_id, contactId: q.contact_id, value: q.value, source: q.source, q: q.q?.slice(0, 100), custom };
}

@Controller('orders')
export class OrdersController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(OrdersReadService) private readonly read: OrdersReadService,
  ) {}

  private async viewer(req: IncomingMessage) {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has('order.view')) throw new AppError('FORBIDDEN', 403, { permission: 'order.view' });
    return a;
  }

  @Get()
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    return this.read.list(await this.viewer(req), orderFilterOf(q), int(q.page, 'page'), int(q.limit, 'limit'));
  }

  @Get('meta')
  async meta(@Req() req: IncomingMessage, @Query('order_id') orderId?: string) {
    return { data: await this.read.meta(await this.viewer(req), orderId || undefined) };
  }

  @Get(':id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get(await this.viewer(req), id) };
  }
}
