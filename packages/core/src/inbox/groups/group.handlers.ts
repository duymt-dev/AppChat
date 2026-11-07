// Handler quản lý nhóm (TIP-025b §A.2–5): chính sách AI (ghi ngay, CAS) + 4 lệnh kênh (thêm thành viên / đổi tên + link / tắt thông báo /
// làm mới) — mỗi lệnh chỉ xếp `group_command` + outbox trong transaction executor; kết quả `queued` không phải đã xong. Thêm thành viên:
// chỉ khách của hội thoại 1-1 người gọi thấy được trên ĐÚNG tài khoản nhóm (≤ 50, không id / SĐT tuỳ ý — DC-247). Không undo lệnh kênh
// (lời mời / đổi tên phía Zalo không thu hồi được) — thao tác ngược là một lệnh mới.
import { Inject, Injectable } from '@nestjs/common';
import type { ChannelRegistry } from '@appchat/channels';
import { AppError, GROUP_ADD_MAX } from '@appchat/shared';
import type { ActionInput, ActionPreview, groupAddMembers, groupCopyLink, groupRefresh, groupSetAiPolicy, groupSetMute, groupUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { CHANNEL_REGISTRY } from '../../channels/public';
import { canSeeConversation, UUID, type Conv } from '../services/access';
import { convTitle } from '../actions/previews/conversation-state.handlers.preview';
import { me, updatedEvent } from '../actions/kit';
import { groupConversation, queueGroupCommand, type GroupCommandKind } from './group-commands';
import { policyState, setGroupPolicy } from './group-policy';

type Queued = { command_id: string; status: 'queued' };
type PolicyOut = { policy: 'mention' | 'auto' | 'off'; policy_version: number };
type Plan = { desired: Record<string, unknown>; summary: string; expected?: string };

@Injectable()
@ActionHandler('group.set_ai_policy')
export class GroupSetAiPolicyHandler implements Handler<ActionInput<typeof groupSetAiPolicy>, PolicyOut> {
  constructor(
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, i: ActionInput<typeof groupSetAiPolicy>, tx: TenantTx): Promise<ActionPreview> {
    const c = await groupConversation(tx, ctx.authz, this.registry, i.conversation_id, 'policy');
    const v = await policyState(tx, c.id);
    if (v !== i.if_version) throw new AppError('CONFLICT', 409, { if_version: `stale:${v}` });
    return preview('write', line(await convTitle(tx, c), i.policy), { changes: updated('conversation', c.id, { group_ai_policy: c.groupAiPolicy ?? 'mention' }, { group_ai_policy: i.policy }) });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof groupSetAiPolicy>, tx: TenantTx): Promise<HandlerOutcome<PolicyOut>> {
    const c = await groupConversation(tx, ctx.authz, this.registry, i.conversation_id, 'policy');
    const r = await setGroupPolicy(tx, c, i.policy, i.if_version, this.clock.now());
    return { result: { policy: i.policy, policy_version: r.version }, before: { policy: r.before }, after: { policy: i.policy, dropped: r.dropped }, events: [await updatedEvent(tx, c, 'group_policy')] };
  }
}

/** Khung chung 4 lệnh kênh: kiểm hội thoại nhóm + năng lực + vai trò → (kiểm riêng) → xếp lệnh. */
abstract class GroupCommandHandler<I extends { conversation_id: string }> implements Handler<I, Queued> {
  protected abstract readonly kind: GroupCommandKind;
  constructor(
    @Inject(CHANNEL_REGISTRY) protected readonly registry: ChannelRegistry,
    @Inject(CLOCK) protected readonly clock: Clock,
  ) {}
  protected abstract plan(ctx: ActionContext, i: I, tx: TenantTx, c: Conv): Promise<Plan>;

  /** Mỗi lớp con khai `preview()` gọi về đây (quét phủ Trợ lý đọc theo từng lớp có @ActionHandler). */
  protected async draft(ctx: ActionContext, i: I, tx: TenantTx): Promise<ActionPreview> {
    const c = await groupConversation(tx, ctx.authz, this.registry, i.conversation_id, this.kind);
    const p = await this.plan(ctx, i, tx, c);
    return preview(this.kind === 'link' ? 'read' : this.kind === 'refresh' ? 'write' : 'send', line(await convTitle(tx, c), p.summary), { changes: [{ entity: 'group_command', after: { kind: this.kind, ...p.desired } }] });
  }

  async execute(ctx: ActionContext, i: I, tx: TenantTx): Promise<HandlerOutcome<Queued>> {
    const c = await groupConversation(tx, ctx.authz, this.registry, i.conversation_id, this.kind);
    const p = await this.plan(ctx, i, tx, c);
    const q = await queueGroupCommand(tx, c, this.kind, me(ctx), p.desired, this.clock.now(), p.expected);
    return { result: { command_id: q.id, status: 'queued' }, after: { command_id: q.id, kind: this.kind }, events: [q.event] };
  }
}

@Injectable()
@ActionHandler('group.add_members')
export class GroupAddMembersHandler extends GroupCommandHandler<ActionInput<typeof groupAddMembers>> {
  protected readonly kind = 'add_members' as const;
  async preview(ctx: ActionContext, i: ActionInput<typeof groupAddMembers>, tx: TenantTx): Promise<ActionPreview> {
    return this.draft(ctx, i, tx);
  }
  protected async plan(ctx: ActionContext, i: ActionInput<typeof groupAddMembers>, tx: TenantTx, g: Conv): Promise<Plan> {
    const ids = [...new Set(i.member_conversation_ids)].slice(0, GROUP_ADD_MAX);
    const convs = await tx.conversation.findMany({ where: { id: { in: ids.filter((x) => UUID.test(x)) } } });
    const members: string[] = [];
    for (const id of ids) {
      const c = convs.find((x) => x.id === id);
      // Ngoài scope = như không tồn tại; khác tài khoản / không phải 1-1 → lỗi rõ (không mời người lạ).
      if (!c || !(await canSeeConversation(tx, ctx.authz, c))) throw new AppError('NOT_FOUND', 404, { member_conversation_ids: `not_found:${id}` });
      if (c.channelAccountId !== g.channelAccountId) throw new AppError('VALIDATION_FAILED', 422, { member_conversation_ids: `other_account:${id}` });
      if (c.kind !== 'direct') throw new AppError('VALIDATION_FAILED', 422, { member_conversation_ids: `not_direct:${id}` });
      members.push(c.externalThreadId);
    }
    const known = await tx.conversationParticipant.findMany({ where: { conversationId: g.id, externalId: { in: members } }, select: { externalId: true } });
    const already = new Set(known.map((p) => p.externalId));
    const todo = members.filter((m) => !already.has(m));
    if (!todo.length) throw new AppError('VALIDATION_FAILED', 422, { member_conversation_ids: 'already_members' });
    return { desired: { member_ids: todo }, summary: String(todo.length) };
  }
}

@Injectable()
@ActionHandler('group.update')
export class GroupUpdateHandler extends GroupCommandHandler<ActionInput<typeof groupUpdate>> {
  protected readonly kind = 'update' as const;
  async preview(ctx: ActionContext, i: ActionInput<typeof groupUpdate>, tx: TenantTx): Promise<ActionPreview> {
    return this.draft(ctx, i, tx);
  }
  protected async plan(_ctx: ActionContext, i: ActionInput<typeof groupUpdate>, tx: TenantTx, g: Conv): Promise<Plan> {
    const st = await tx.conversationGroupState.findUnique({ where: { conversationId: g.id }, select: { providerVersion: true, providerName: true, linkEnabled: true } });
    // Phải có ảnh chụp nhà cung cấp hiện hành (làm mới trước) và đúng phiên bản người dùng đã thấy.
    if (!st?.providerVersion || st.providerVersion !== i.expected_version) throw new AppError('CONFLICT', 409, { expected_version: st?.providerVersion ? `stale:${st.providerVersion}` : 'refresh_required' });
    const desired: Record<string, unknown> = {};
    if (i.name !== undefined && i.name.trim() !== st.providerName) desired.name = i.name.trim();
    if (i.invite_link_enabled !== undefined && i.invite_link_enabled !== st.linkEnabled) desired.invite_link_enabled = i.invite_link_enabled;
    if (!Object.keys(desired).length) throw new AppError('VALIDATION_FAILED', 422, { name: 'no_change' });
    return { desired, summary: Object.keys(desired).join(','), expected: i.expected_version };
  }
}

@Injectable()
@ActionHandler('group.set_mute')
export class GroupSetMuteHandler extends GroupCommandHandler<ActionInput<typeof groupSetMute>> {
  protected readonly kind = 'set_mute' as const;
  async preview(ctx: ActionContext, i: ActionInput<typeof groupSetMute>, tx: TenantTx): Promise<ActionPreview> {
    return this.draft(ctx, i, tx);
  }
  protected async plan(_ctx: ActionContext, i: ActionInput<typeof groupSetMute>): Promise<Plan> {
    return { desired: { muted: i.muted }, summary: i.muted ? 'mute' : 'unmute' };
  }
}

@Injectable()
@ActionHandler('group.refresh')
export class GroupRefreshHandler extends GroupCommandHandler<ActionInput<typeof groupRefresh>> {
  protected readonly kind = 'refresh' as const;
  async preview(ctx: ActionContext, i: ActionInput<typeof groupRefresh>, tx: TenantTx): Promise<ActionPreview> {
    return this.draft(ctx, i, tx);
  }
  protected async plan(_ctx: ActionContext, _i: ActionInput<typeof groupRefresh>, tx: TenantTx, g: Conv): Promise<Plan> {
    const open = await tx.groupCommand.findFirst({ where: { conversationId: g.id, kind: 'refresh', status: { in: ['queued', 'dispatch_reserved'] } }, select: { id: true } });
    if (open) throw new AppError('CONFLICT', 409, { command_id: `open:${open.id}` });
    return { desired: {}, summary: 'refresh' };
  }
}

/** Sao chép link tham gia (§A.6): chỉ người bấm trên UI (không AI / Trợ lý), lệnh đọc — không bao giờ bật link. */
@Injectable()
@ActionHandler('group.copy_link')
export class GroupCopyLinkHandler extends GroupCommandHandler<ActionInput<typeof groupCopyLink>> {
  protected readonly kind = 'link' as const;
  async preview(ctx: ActionContext, i: ActionInput<typeof groupCopyLink>, tx: TenantTx): Promise<ActionPreview> {
    return this.draft(ctx, i, tx);
  }
  protected async plan(ctx: ActionContext): Promise<Plan> {
    if (ctx.source !== 'ui') throw new AppError('FORBIDDEN', 403, { source: 'human_only' });
    return { desired: {}, summary: 'link' };
  }
}

export const GROUP_HANDLERS = [GroupSetAiPolicyHandler, GroupAddMembersHandler, GroupUpdateHandler, GroupSetMuteHandler, GroupRefreshHandler, GroupCopyLinkHandler];
