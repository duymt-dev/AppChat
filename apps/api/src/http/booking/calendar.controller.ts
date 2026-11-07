// Đọc Lịch hẹn (Blueprint §4.4 booking, TIP-033 — shape packages/shared/src/api/calendar.ts): /v1/calendar?from=&to=&staff_id=&status=&
// team=&q=&cf.* (khoảng ngày ≤ 62 ngày, giờ workspace), /calendar/meta (?appointment_id= → lịch sử khách), /calendar/slots, /calendar/:id,
// /settings/booking (`booking.config`). Quyền `booking.view`; data scope booking trong service (không thấy → 404). Ghi qua action appointment.*.
import { Controller, Get, Inject, Param, Query, Req } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { CalendarReadService } from '@appchat/core';
import { AppError } from '@appchat/shared';
import { ACTOR_RESOLVER, type ActorResolver } from '../kernel/request-actor';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 62;

function range(from?: string, to?: string) {
  if (!from || !DATE.test(from)) throw new AppError('VALIDATION_FAILED', 400, { from: 'invalid' });
  const end = to && DATE.test(to) ? to : from;
  const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (Number.isNaN(days) || days < 0 || days > MAX_DAYS) throw new AppError('VALIDATION_FAILED', 400, { to: 'range' });
  return { from, to: end };
}

@Controller()
export class CalendarController {
  constructor(
    @Inject(ACTOR_RESOLVER) private readonly actors: ActorResolver,
    @Inject(CalendarReadService) private readonly read: CalendarReadService,
  ) {}

  private async viewer(req: IncomingMessage, perm = 'booking.view') {
    const a = await this.actors.resolve(req);
    if (!a.authz.isOwner && !a.authz.permissions.has(perm as never)) throw new AppError('FORBIDDEN', 403, { permission: perm });
    return a;
  }

  @Get('calendar')
  async list(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    const custom = Object.fromEntries(Object.entries(q).filter(([k, x]) => k.startsWith('cf.') && x).map(([k, x]) => [k.slice(3), String(x).slice(0, 100)]));
    return this.read.list(await this.viewer(req), { ...range(q.from, q.to), staffId: q.staff_id, status: q.status, team: q.team, q: q.q?.slice(0, 100), custom });
  }

  @Get('calendar/meta')
  async meta(@Req() req: IncomingMessage, @Query('appointment_id') appointmentId?: string) {
    return { data: await this.read.meta(await this.viewer(req), appointmentId || undefined) };
  }

  @Get('calendar/slots')
  async slots(@Req() req: IncomingMessage, @Query() q: Record<string, string | undefined>) {
    if (!q.service_id || !q.date || !DATE.test(q.date)) throw new AppError('VALIDATION_FAILED', 400, { date: 'invalid' });
    return { data: await this.read.slots(await this.viewer(req), { serviceId: q.service_id, date: q.date, staffId: q.staff_id || undefined, excludeId: q.exclude_id || undefined }) };
  }

  @Get('calendar/:id')
  async get(@Req() req: IncomingMessage, @Param('id') id: string) {
    return { data: await this.read.get(await this.viewer(req), id) };
  }

  @Get('settings/booking')
  async settings(@Req() req: IncomingMessage) {
    return { data: await this.read.settings(await this.viewer(req, 'booking.config')) };
  }
}
