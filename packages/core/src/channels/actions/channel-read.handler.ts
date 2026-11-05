// channel.search (TIP-023b R2 · DC-224, channels.manage, read): Trợ lý tra tài khoản kênh đã kết nối để có channel_account_id. Chỉ id / loại /
// tên / trạng thái / tạm dừng — không bao giờ trả credentials, health chi tiết hay external id.
import { Injectable } from '@nestjs/common';
import { foldText } from '@appchat/shared';
import type { ActionInput, channelSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';

type Input = ActionInput<typeof channelSearch>;
type Out = { channels: { id: string; type: string; name: string; status: string; paused: boolean }[] };

@Injectable()
@ActionHandler('channel.search')
export class ChannelSearchHandler implements Handler<Input, Out> {
  async execute(_ctx: ActionContext, i: Input, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const rows = await tx.channelAccount.findMany({
      where: { status: { not: 'disconnected' }, ...(i.type ? { type: i.type } : {}) },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, type: true, name: true, status: true, pausedAt: true },
    });
    const f = foldText(i.q ?? '');
    const channels = rows.filter((r) => !f || foldText(r.name).includes(f)).map((r) => ({ id: r.id, type: r.type, name: r.name, status: r.status, paused: !!r.pausedAt }));
    return { result: { channels: channels.slice(0, i.limit ?? 10) } };
  }
}
