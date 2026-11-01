// sla.update_default (Blueprint §3.4 support, REQ-H03 — Cài đặt › SLA) + ticket.search (agent / Trợ lý). Chính sách mặc định không xoá
// được; đổi mục tiêu chỉ áp cho ticket tạo sau (ticket cũ giữ hạn đã chụp). `sla.manage` = Chủ sở hữu + Quản lý.
import { Inject, Injectable } from '@nestjs/common';
import { TenantSql as Prisma } from '@appchat/db';
import { foldText, type AuthzContext } from '@appchat/shared';
import type { ActionInput, slaUpdateDefault, ticketSearch } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { defaultPolicy, escalationOf } from '../services/sla-clock';
import { supportScopeSql } from '../ticket-access';

@Injectable()
@ActionHandler('sla.update_default')
export class SlaUpdateDefaultHandler implements Handler<ActionInput<typeof slaUpdateDefault>, { ok: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof slaUpdateDefault>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    const now = this.clock.now();
    const p = await defaultPolicy(tx, now);
    const before = { id: p.id, frt_ai: p.frtAiMin, frt_human: p.frtHumanMin, ttr_ai: p.ttrAiMin, ttr_human: p.ttrHumanMin, escalation: p.escalation };
    await tx.slaPolicy.update({
      where: { id: p.id },
      data: {
        ...(input.frt_ai !== undefined ? { frtAiMin: input.frt_ai } : {}),
        ...(input.frt_human !== undefined ? { frtHumanMin: input.frt_human } : {}),
        ...(input.ttr_ai !== undefined ? { ttrAiMin: input.ttr_ai } : {}),
        ...(input.ttr_human !== undefined ? { ttrHumanMin: input.ttr_human } : {}),
        ...(input.escalation ? { escalation: { ...escalationOf(p), ...input.escalation } } : {}),
        updatedAt: now,
      },
    });
    return { result: { ok: true }, before };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; frt_ai: number; frt_human: number; ttr_ai: number; ttr_human: number; escalation: object };
    await tx.slaPolicy.update({ where: { id: b.id }, data: { frtAiMin: b.frt_ai, frtHumanMin: b.frt_human, ttrAiMin: b.ttr_ai, ttrHumanMin: b.ttr_human, escalation: b.escalation, updatedAt: this.clock.now() } });
  }
}

/** Điều kiện tìm ticket dùng chung danh sách + ticket.search (alias `t`). */
export function searchSql(authz: AuthzContext, f: { q?: string | undefined; status?: string | undefined; priority?: string | undefined; sla?: string | undefined }, now: Date): Prisma.Sql[] {
  const parts = [supportScopeSql(authz)];
  if (f.status && f.status !== 'all') parts.push(Prisma.sql`t.status::text = ${f.status}`);
  if (f.priority && f.priority !== 'all') parts.push(Prisma.sql`t.priority::text = ${f.priority}`);
  if (f.sla === 'breach') parts.push(Prisma.sql`((t.status <> 'closed' AND coalesce(t.paused_since, ${now}) > t.ttr_due_at) OR (t.status = 'closed' AND t.sla_result = 'breached'))`);
  if (f.sla === 'risk')
    parts.push(Prisma.sql`(t.status <> 'closed' AND coalesce(t.paused_since, ${now}) <= t.ttr_due_at
      AND (t.ttr_due_at - coalesce(t.paused_since, ${now}) <= interval '60 minutes'
        OR coalesce(t.paused_since, ${now}) - t.ttr_start_at >= (t.ttr_due_at - t.ttr_start_at) * 0.8))`);
  if (f.sla === 'ok')
    parts.push(Prisma.sql`((t.status = 'closed' AND t.sla_result = 'met') OR (t.status <> 'closed' AND t.ttr_due_at - coalesce(t.paused_since, ${now}) > interval '60 minutes'
      AND coalesce(t.paused_since, ${now}) - t.ttr_start_at < (t.ttr_due_at - t.ttr_start_at) * 0.8))`);
  const q = f.q?.trim();
  if (q) {
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    parts.push(Prisma.sql`(lower(t.code) LIKE ${like} OR f_unaccent(lower(t.title)) LIKE ${like} OR f_unaccent(lower(t.company)) LIKE ${like} OR lower(t.email) LIKE ${like})`);
  }
  return parts;
}

@Injectable()
@ActionHandler('ticket.search')
export class TicketSearchHandler implements Handler<ActionInput<typeof ticketSearch>, { tickets: { id: string; code: string; title: string; status: string }[] }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof ticketSearch>, tx: TenantTx) {
    const parts = searchSql(ctx.authz, input, this.clock.now());
    const rows = await tx.$queryRaw<{ id: string; code: string; title: string; status: string }[]>`
      SELECT t.id, t.code, t.title, t.status::text AS status FROM ticket t WHERE ${Prisma.join(parts, ' AND ')} ORDER BY t.created_at DESC, t.id DESC LIMIT 20`;
    return { result: { tickets: rows } };
  }
}
