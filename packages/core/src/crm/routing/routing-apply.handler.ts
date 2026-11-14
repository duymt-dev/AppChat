// lead_routing.apply (TIP-042b) — system-only (consumer `lead.routing_requested`, actor `system:lead-routing`). Input chỉ event_id: handler
// nạp event đã lưu (đúng topic), không nhận user_id từ người gọi. Thứ tự khoá cố định: con trỏ rule → khách → hội thoại. Chỉ cấp chủ ĐẦU
// TIÊN: khách còn lead, chưa có chủ, chưa xoá, tạo sau `enabled_at`; hội thoại 1-1 của chính khách và chưa có người phụ trách. Đã có chủ /
// gán tay / đổi trạng thái → no-op kèm lý do. Một quyết định mỗi khách + mỗi event (unique) — chạy lại trả kết quả cũ, con trỏ không tiến hai lần.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { ActionInput, leadRoutingApply } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { needPlatform } from '../../kernel/tenant/platform-read';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { poolUsers, ruleFor } from './routing.repo';
import { eligibleUsers, leastBusy, loadOf, nextAfter } from './routing-selector';
import { soleTeamOf } from '../../authz/data-access';

export const LEAD_ROUTING_ACTOR = 'system:lead-routing';
export const LEAD_ROUTING_TOPIC = 'lead.routing_requested';

type Out = { contact_id: string | null; selected_user_id: string | null; reason: string };
type Payload = { contact_id?: string; conversation_id?: string | null; channel_account_id?: string | null };

@Injectable()
@ActionHandler('lead_routing.apply')
export class LeadRoutingApplyHandler implements Handler<ActionInput<typeof leadRoutingApply>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(PLATFORM_DB) private readonly platform: PlatformDb | undefined,
  ) {}

  /** Callback hệ thống không có thẻ xác nhận — chặn ngay ở preview (Trợ lý / UI không lấy được preview để xác nhận). */
  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof leadRoutingApply>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== LEAD_ROUTING_ACTOR) throw new AppError('FORBIDDEN', 403, { source: ctx.source });
    const ev = await tx.outboxEvent.findUnique({ where: { id: i.event_id }, select: { topic: true, payload: true } });
    if (!ev || ev.topic !== LEAD_ROUTING_TOPIC) throw new AppError('NOT_FOUND', 404, { event_id: 'not_found' });
    const p = ev.payload as Payload & { ws?: string; occurred_at?: string };
    if (p.ws && p.ws !== ctx.workspaceId) throw new AppError('NOT_FOUND', 404, { event_id: 'not_found' });
    if (!p.contact_id) throw new AppError('VALIDATION_FAILED', 422, { event_id: 'no_contact' });
    const prior = await tx.leadRoutingDecision.findFirst({ where: { OR: [{ originatingEventId: i.event_id }, { contactId: p.contact_id }] } });
    if (prior) return { result: { contact_id: prior.contactId, selected_user_id: prior.selectedUserId, reason: prior.originatingEventId === i.event_id ? prior.reason : 'decided' } };

    const now = this.clock.now();
    const rule = await ruleFor(tx, p.channel_account_id ?? null);
    const decide = async (reason: string, user: string | null = null, conv: string | null = null): Promise<HandlerOutcome<Out>> => {
      await tx.leadRoutingDecision.create({
        data: { id: uuidv7(now.getTime()), contactId: p.contact_id!, originatingEventId: i.event_id, ruleId: rule?.id ?? null, ruleVersion: rule?.version ?? null, selectedUserId: user, conversationId: conv, reason, createdAt: now },
      });
      return { result: { contact_id: p.contact_id!, selected_user_id: user, reason } };
    };
    if (!rule || !rule.enabled || rule.mode === 'manual') return decide('manual');

    // Khoá con trỏ trước (tuần tự hoá lựa chọn), rồi khách, rồi hội thoại.
    await tx.$executeRaw`INSERT INTO lead_routing_cursor (rule_id) VALUES (${rule.id}::uuid) ON CONFLICT (rule_id) DO NOTHING`;
    const [cur] = await tx.$queryRaw<{ last_user_id: string | null }[]>`SELECT last_user_id FROM lead_routing_cursor WHERE rule_id = ${rule.id}::uuid FOR UPDATE`;
    const [c] = await tx.$queryRaw<{ name: string; owner_user_id: string | null; stage: string; deleted_at: Date | null; created_at: Date }[]>`
      SELECT name, owner_user_id, stage::text AS stage, deleted_at, created_at FROM contact WHERE id = ${p.contact_id}::uuid FOR UPDATE`;
    if (!c || c.deleted_at) return decide('contact_gone');
    if (c.owner_user_id) return decide('has_owner');
    if (c.stage !== 'lead') return decide('not_lead');
    // Mốc "lead mới" = lúc khách được tạo (event ghi cùng transaction, đồng hồ hệ thống) — không theo giờ gửi của tin (`contact.created_at`).
    const createdAt = p.occurred_at ? new Date(p.occurred_at) : c.created_at;
    if (!rule.enabledAt || createdAt < rule.enabledAt) return decide('before_enabled');
    const [conv] = p.conversation_id
      ? await tx.$queryRaw<{ id: string; kind: string; contact_id: string | null; assignee_user_id: string | null; title: string | null }[]>`
          SELECT id, kind::text AS kind, contact_id, assignee_user_id, title FROM conversation WHERE id = ${p.conversation_id}::uuid FOR UPDATE`
      : [];
    if (conv && conv.kind === 'direct' && conv.contact_id === p.contact_id && conv.assignee_user_id) return decide('manually_assigned');

    const pool = await poolUsers(tx, rule);
    const eligible = new Set(await eligibleUsers(tx, needPlatform(this.platform, 'lead_routing.apply'), ctx.workspaceId, pool));
    const last = cur?.last_user_id ?? null;
    const user = rule.mode === 'least_busy' ? leastBusy(pool, eligible, await loadOf(tx, [...eligible]), last) : nextAfter(pool, eligible, rule.mode === 'by_channel' ? null : last);
    if (!user) return decide('no_eligible');

    // DC-299 (TIP-042c): nhóm của khách = nhóm của rule (pool theo nhóm) → nhóm duy nhất của người nhận; mơ hồ → null.
    const team = rule.teamId ?? (await soleTeamOf(tx, user));
    await tx.contact.update({ where: { id: p.contact_id }, data: { ownerUserId: user, teamId: team } });
    const assignConv = conv && conv.kind === 'direct' && conv.contact_id === p.contact_id && !conv.assignee_user_id ? conv.id : null;
    if (assignConv) await tx.conversation.update({ where: { id: assignConv }, data: { assigneeUserId: user, teamId: team } });
    if (rule.mode !== 'by_channel') await tx.leadRoutingCursor.update({ where: { ruleId: rule.id }, data: { lastUserId: user } });
    const out = await decide(rule.mode, user, assignConv);
    return {
      ...out,
      before: { contact_id: p.contact_id, owner_user_id: null },
      after: { contact_id: p.contact_id, owner_user_id: user, rule_id: rule.id, rule_version: rule.version, reason: rule.mode, conversation_id: assignConv },
      events: [
        { topic: 'contact.owner_changed', payload: { contact_id: p.contact_id, from: null, to: user, move: { conversations: false, quotes: false, appointments: false }, auto: true, rule_id: rule.id } },
        ...(assignConv
          ? [{ topic: 'conversation.assigned', payload: { conversation_id: assignConv, channel_account_id: p.channel_account_id ?? null, contact_id: p.contact_id, assignee_user_id: user, contact_owner_user_id: user, team_id: team, assignee_agent_id: null, by_user_id: null, auto: true, title: (conv?.title ?? c.name).slice(0, 200) } }]
          : []),
      ],
    };
  }
}
