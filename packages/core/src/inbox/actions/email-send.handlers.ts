// contact.send_email (REQ-F11 Hồ sơ 360°, TIP-018): thư độc lập tới khách qua kênh Email của workspace — mở hội thoại email mới
// (thread id = Message-ID đặt trước của thư đầu, `email_thread` giữ địa chỉ + tiêu đề) → ghi tin ra + outbox như message.send;
// khách trả lời (References / In-Reply-To = Message-ID đó) quay về đúng hội thoại. Chưa có tài khoản email `from` → 409.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, contactSendEmail } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { ChannelSendQueue, openEmailThread } from '../../channels/public';
import { CrmMembers, editableContact } from '../../crm/public';
import { scopeCols } from '../services/access';
import { enqueueOutgoing, writeOutgoing } from '../services/outbound';
import { previewOf } from '../services/view';
import { me } from './kit';
import { senderOf } from './message.handlers';
import { sendEmailPreview } from './previews/email-send.handlers.preview';

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
type Out = { ok: boolean; conversation_id?: string };

@Injectable()
@ActionHandler('contact.send_email')
export class ContactSendEmailHandler implements Handler<ActionInput<typeof contactSendEmail>, Out> {
  constructor(
    @Inject(ChannelSendQueue) private readonly queue: ChannelSendQueue | null,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactSendEmail>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { contact } = await editableContact(tx, ctx.authz, input.contact_id);
    const to = input.to.trim().toLowerCase();
    if (!EMAIL.test(to)) throw new AppError('VALIDATION_FAILED', 422, { to: 'invalid' });
    const from = input.from.toLowerCase();
    const account = await tx.channelAccount.findFirst({ where: { type: 'email', externalId: from, status: { not: 'disconnected' } } });
    if (!account) throw new AppError('INVALID_STATE', 409, { connector: 'email' });

    const now = this.clock.now();
    const threadId = `<${uuidv7(now.getTime())}@${from.split('@')[1]}>`;
    // Địa chỉ nhận gắn vào khách (identity của tài khoản email) nếu chưa thuộc khách nào — thư trả lời về đúng khách.
    const key = { channelAccountId_externalId: { channelAccountId: account.id, externalId: to } };
    if (!(await tx.contactIdentity.findUnique({ where: key, select: { id: true } }))) {
      await tx.contactIdentity.create({ data: { id: uuidv7(now.getTime()), contactId: contact.id, channelType: 'email', channelAccountId: account.id, externalId: to, displayName: contact.name, createdAt: now } });
    }
    const conv = await tx.conversation.create({
      data: {
        id: uuidv7(now.getTime()),
        channelAccountId: account.id,
        channelType: 'email',
        contactId: contact.id,
        kind: 'direct',
        externalThreadId: threadId,
        assigneeUserId: me(ctx) ?? contact.ownerUserId,
        lastMessageAt: now,
        lastMessagePreview: previewOf('text', input.body),
        createdAt: now,
      },
    });
    await openEmailThread(tx, { channelAccountId: account.id, threadId, address: to, subject: input.subject, now });
    const out = await writeOutgoing(tx, { conv, kind: 'text', body: input.body, sender: await senderOf(ctx, this.members), now });
    out.job.proactive = true;
    const cols = await scopeCols(tx, conv);
    return {
      result: { ok: true, conversation_id: conv.id },
      after: { conversation_id: conv.id, channel_account_id: account.id, to, subject: input.subject },
      events: [
        { topic: 'conversation.updated', payload: { ...cols, change: 'created' } },
        { topic: 'message.updated', payload: { ...cols, message_id: out.messageId, change: 'status' } },
      ],
      afterCommit: () => enqueueOutgoing(this.queue, ctx.workspaceId, out),
    };
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contactSendEmail>, tx: TenantTx) {
    return sendEmailPreview(ctx, tx, input);
  }
}
