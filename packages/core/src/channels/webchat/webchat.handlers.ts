// `webchat.update_widget` (TIP-017, Blueprint §3.4): lần đầu (hoặc `enabled: true` khi tài khoản đã ngắt) dựng widget + tài khoản
// kênh `webchat` (connected — không có bước xác thực) dưới khoá workspace + hạn mức gói `max_channels` (như start_login — DC-069);
// `enabled: false` = tạm dừng tài khoản (widget "tạm ngoại tuyến"). Route `tenant_widget_route` (public_key → workspace +
// allowed_domains) và `tenant_channel_route` ghi trong transaction nền tảng.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, serverMessages } from '@appchat/shared';
import type { ActionInput, webchatUpdateWidget } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import { uuidv7 } from '../../kernel/ids';
import type { ActionContext, PlatformTx, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { QuotaService } from '../../billing/public';
import { openReservations, reserveQuota } from '../../kernel/consistency/handler-adapter';
import { assertAgentAssignable } from '../../ai/agents/agent-names';
import { ChannelControl } from '../services/control';
import { ChannelAccounts, defaultSettings, routeStatusOf, type AccountRow, type AccountStatus, type StatusEvent } from '../services/accounts.service';
import { DEFAULT_COLOR, configOf, newPublicKey, prechatOf, type WidgetConfig } from './widget.service';
import { widgetPreview } from './previews/webchat.handlers.preview';

type In = ActionInput<typeof webchatUpdateWidget>;
type Out = { ok: boolean; channel_account_id?: string; public_key?: string };
type Event = StatusEvent | { topic: 'channel.connected'; payload: Record<string, unknown> };

const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

@Injectable()
@ActionHandler('webchat.update_widget')
export class WebchatUpdateWidgetHandler implements Handler<In, Out> {
  constructor(
    @Inject(ChannelAccounts) private readonly accounts: ChannelAccounts | null,
    @Inject(ChannelControl) private readonly control: ChannelControl | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Pha nền tảng (TIP-045b): chỉ ĐỌC tenant — quyết định có thêm tài khoản kênh không (cần giữ chỗ hạn mức dưới khoá workspace), sinh
   * id / public key tất định. Mọi ghi tenant ở `applyTenant`, route nền tảng ở `finalizePlatform`.
   */
  async execute(ctx: ActionContext, input: In, tx: TenantTx, ptx?: PlatformTx): Promise<HandlerOutcome<Out>> {
    const accounts = this.accounts;
    if (!accounts) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'channels chưa cấu hình (PlatformDb)');
    if (!ptx) throw new AppError('INTERNAL', 500, undefined, 'webchat.update_widget cần PlatformTx');
    await assertAgentAssignable(tx, input.agent_id);
    const now = this.clock.now();
    const widget = await tx.webchatWidget.findFirst({ orderBy: { createdAt: 'asc' } });
    const acc = widget ? await tx.channelAccount.findUnique({ where: { id: widget.channelAccountId } }) : null;
    const live = !!acc && acc.status !== 'disconnected';
    const adding = !live && input.enabled !== false;
    if (adding) {
      await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${ctx.workspaceId}::uuid FOR UPDATE`;
      await new QuotaService(ptx, () => this.clock.now()).assert(ctx.workspaceId, 'channels', (await accounts.countLive(tx)) + (await openReservations(ptx, ctx.workspaceId, 'channels')));
      await reserveQuota(ptx, ctx, 'channels', now);
    }
    const accountId = acc?.id ?? uuidv7(now.getTime());
    const toggled = live && input.enabled !== undefined && input.enabled === !!acc!.pausedAt;
    const running = adding || (toggled ? input.enabled === true : !!acc && acc.status === 'connected' && !acc.pausedAt);
    const control = this.control;
    const plan = { input, accountId, publicKey: widget?.publicKey ?? newPublicKey(), widgetId: widget?.id ?? uuidv7(now.getTime()), by: userOf(ctx), at: now.toISOString() };
    return {
      result: { ok: true },
      tenantPlan: plan,
      // Worker ROLE=channels mở / đóng worker gửi của tài khoản ngay (không chờ nhịp 10 giây).
      ...(control && (adding || toggled) ? { afterCommit: () => control.send({ op: running ? 'start' : 'stop', account_id: accountId }) } : {}),
    };
  }

  /** Pha tenant: dựng / cập nhật widget + tài khoản (áp lại an toàn — cùng id, cập nhật theo input). */
  async applyTenant(_ctx: ActionContext, plan: Record<string, unknown>, tx: TenantTx) {
    const accounts = this.accounts!;
    const p = plan as { input: In; accountId: string; publicKey: string; widgetId: string; by: string | null; at: string };
    const input = p.input;
    const now = new Date(p.at);
    const t = serverMessages('vi').channels.widget;
    const events: Event[] = [];
    let widget = await tx.webchatWidget.findFirst({ orderBy: { createdAt: 'asc' } });
    let acc: AccountRow | null = widget ? await tx.channelAccount.findUnique({ where: { id: widget.channelAccountId } }) : await tx.channelAccount.findUnique({ where: { id: p.accountId } });
    const before = widget ? { enabled: !!acc && acc.status === 'connected' && !acc.pausedAt, name: widget.name, greeting: widget.greeting } : null;
    const live = !!acc && acc.status !== 'disconnected';
    if (!live && input.enabled !== false) {
      const name = input.name?.trim() || widget?.name || t.name;
      if (acc) {
        acc = await tx.channelAccount.update({ where: { id: acc.id }, data: { status: 'connected', pausedAt: null, name, health: { status: 'connected', checked_at: now.toISOString() }, lastEventAt: now } });
      } else {
        acc = await tx.channelAccount.create({
          data: { id: p.accountId, type: 'webchat', name, externalId: p.publicKey, status: 'connected', settings: { ...defaultSettings(), hours: '24/7' }, createdBy: p.by, createdAt: now, lastEventAt: now },
        });
      }
      widget ??= await tx.webchatWidget.create({
        data: { id: p.widgetId, channelAccountId: acc.id, publicKey: p.publicKey, name, greeting: t.greeting, theme: { color: DEFAULT_COLOR }, prechatForm: { ...prechatOf({ prechatForm: {} }) }, createdAt: now },
      });
      events.push({ topic: 'channel.connected', payload: { channel_account_id: acc.id, type: 'webchat', name } });
    } else if (live && input.enabled !== undefined && input.enabled === !!acc!.pausedAt) {
      // Bật / tắt tài khoản đang có = tiếp tục / tạm dừng.
      const r = await accounts.setStatus(tx, acc!, { pausedAt: input.enabled ? null : now }, now, input.enabled ? undefined : 'paused');
      acc = r.row;
      if (r.event) events.push(r.event);
    }
    if (!widget || !acc) return { result: { ok: true } };
    const cfg = configOf(widget);
    const next: WidgetConfig = {
      ...cfg,
      ...(input.ai_chat !== undefined ? { ai_chat: input.ai_chat } : {}),
      ...(input.ai_on !== undefined ? { ai_on: input.ai_on } : {}),
      ...(input.handoff !== undefined ? { handoff: input.handoff } : {}),
      ...(input.tone ? { tone: input.tone } : {}),
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.knowledge_on ? { knowledge_on: input.knowledge_on } : {}),
      ...(input.collect_on ? { collect_on: input.collect_on } : {}),
      // `actions` = danh sách còn lại (FE xoá nút bằng cách gửi danh sách thiếu nút đó); nút lạ bỏ qua.
      ...(input.actions ? { actions: input.actions.flatMap((a) => cfg.actions.filter((x) => x.key === a.key).map((x) => ({ ...x, on: a.on }))) } : {}),
    };
    const name = input.name?.trim();
    widget = await tx.webchatWidget.update({
      where: { id: widget.id },
      data: {
        ...(name ? { name } : {}),
        ...(input.greeting !== undefined ? { greeting: input.greeting } : {}),
        ...(input.color ? { theme: { ...(widget.theme as object), color: input.color.toUpperCase() } } : {}),
        ...(input.prechat !== undefined ? { prechatForm: { ...prechatOf(widget), enabled: input.prechat } } : {}),
        // `agent_id: ''` = bỏ gán (như channel.update_settings).
        ...(input.agent_id !== undefined ? { agentId: input.agent_id || null } : {}),
        ...(input.allowed_domains ? { allowedDomains: [...new Set(input.allowed_domains)] } : {}),
        settings: { ...next },
        updatedAt: now,
      },
    });
    if (name && acc.name !== name) acc = await tx.channelAccount.update({ where: { id: acc.id }, data: { name } });
    // Agent trực của widget = agent mặc định của tài khoản (hội thoại mới nhận agent này — inbound pipeline).
    if (input.agent_id !== undefined) {
      acc = await tx.channelAccount.update({ where: { id: acc.id }, data: { settings: { ...(acc.settings as object), agent_id: input.agent_id || null } } });
    }

    const running = acc.status === 'connected' && !acc.pausedAt;
    return {
      result: { ok: true, channel_account_id: acc.id, public_key: widget.publicKey },
      before,
      after: { enabled: running, name: widget.name, greeting: widget.greeting, allowed_domains: widget.allowedDomains },
      events,
    };
  }

  /** Xác nhận nền tảng: route widget (public_key → workspace + allowed_domains) + route kênh theo trạng thái tenant hiện tại. */
  async finalizePlatform(ctx: ActionContext, _plan: Record<string, unknown>, ptx: PlatformTx, read: TenantTx) {
    const widget = await read.webchatWidget.findFirst({ orderBy: { createdAt: 'asc' } });
    const acc = widget ? await read.channelAccount.findUnique({ where: { id: widget.channelAccountId } }) : null;
    if (!widget || !acc) return;
    await ptx.tenantWidgetRoute.upsert({
      where: { publicKey: widget.publicKey },
      create: { publicKey: widget.publicKey, workspaceId: ctx.workspaceId, allowedDomains: widget.allowedDomains },
      update: { workspaceId: ctx.workspaceId, allowedDomains: widget.allowedDomains },
    });
    await this.accounts!.route(ctx.workspaceId, acc, routeStatusOf(acc.status as AccountStatus, acc.pausedAt), ptx);
  }

  async preview(_ctx: ActionContext, input: In, tx: TenantTx) {
    return widgetPreview(tx, input);
  }
}
