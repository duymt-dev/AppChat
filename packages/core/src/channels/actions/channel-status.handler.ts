// channel.status (TIP-023c, channels.manage, read): trạng thái tài khoản + lần đăng nhập QR hiện hành cho khối `qr` của Trợ lý. Không ảnh
// QR / credential — ảnh lấy qua `qr_ref` (GET có auth). Trợ lý poll 2 giây chỉ khi khối hiện và lần hiện hành chưa kết thúc.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, channelStatus } from '@appchat/actions';
import type { ChannelStatusDto } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { ChannelControl } from '../services/control';
import { channelStatusOf } from '../services/login-attempt';

@Injectable()
@ActionHandler('channel.status')
export class ChannelStatusHandler implements Handler<ActionInput<typeof channelStatus>, ChannelStatusDto> {
  constructor(@Optional() @Inject(ChannelControl) private readonly control: ChannelControl | null = null) {}

  async execute(_ctx: ActionContext, i: ActionInput<typeof channelStatus>, tx: TenantTx): Promise<HandlerOutcome<ChannelStatusDto>> {
    return { result: await channelStatusOf(tx, this.control, i.channel_account_id) };
  }
}
