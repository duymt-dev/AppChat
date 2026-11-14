// conversation.create_group (TIP-023b SPEC D · DC-247, inbox.manage, risk send): chỉ lưu yêu cầu bền + outbox `channel.group_requested` trong
// transaction của executor — kết quả `queued` không phải nhóm đã tạo. Trợ lý xác nhận (preview: tên nhóm · tài khoản · thành viên · hệ quả
// mời); agent / task luôn qua duyệt (risk send, không miễn hội thoại đang phục vụ). Không undo: lời mời đã gửi phía Zalo không thu hồi được.
import { Inject, Injectable } from '@nestjs/common';
import type { ChannelRegistry } from '@appchat/channels';
import type { ActionInput, ActionPreview, conversationCreateGroup } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, line, preview } from '../../kernel/actions/preview-kit';
import { uuidv7 } from '../../kernel/ids';
import { CHANNEL_REGISTRY, planGroup } from '../../channels/public';
import { me } from './kit';

type In = ActionInput<typeof conversationCreateGroup>;
type Out = { request_id: string; status: 'queued' };

@Injectable()
@ActionHandler('conversation.create_group')
export class ConversationCreateGroupHandler implements Handler<In, Out> {
  constructor(
    @Inject(CHANNEL_REGISTRY) private readonly registry: ChannelRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const plan = await planGroup(tx, ctx.authz, this.registry, input);
    const key = ctx.idempotencyKey ? `group:${ctx.idempotencyKey}` : null;
    if (key) {
      const prev = await tx.conversationGroupRequest.findUnique({ where: { idempotencyKey: key }, select: { id: true, payloadDigest: true } });
      if (prev && prev.payloadDigest === plan.digest) return { result: { request_id: prev.id, status: 'queued' } };
    }
    const id = uuidv7(now.getTime());
    await tx.conversationGroupRequest.create({
      data: {
        id,
        channelAccountId: plan.account.id,
        name: plan.name,
        participants: plan.participants as object[],
        payloadDigest: plan.digest,
        idempotencyKey: key,
        requesterId: me(ctx),
        runId: ctx.runId ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });
    return {
      result: { request_id: id, status: 'queued' },
      after: { id },
      events: [{ topic: 'channel.group_requested', payload: { request_id: id, channel_account_id: plan.account.id } }],
    };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx): Promise<ActionPreview> {
    const plan = await planGroup(tx, ctx.authz, this.registry, input);
    const unknownBefore = await tx.conversationGroupRequest.count({ where: { channelAccountId: plan.account.id, payloadDigest: plan.digest, status: 'unknown' } });
    return preview('send', line(plan.name, plan.account.name, `${plan.participants.length}`), {
      count: plan.participants.length,
      changes: [created('conversation', { kind: 'group', name: plan.name, channel_account: plan.account.name, members: plan.participants.map((p) => p.display_name) })],
      // Lời mời hiện với khách ngay; lần tạo trước cùng nội dung chưa rõ kết quả → có thể nhóm cũ đã tồn tại.
      warnings: ['invites_customers', ...(unknownBefore ? ['previous_unknown'] : [])],
    });
  }
}
