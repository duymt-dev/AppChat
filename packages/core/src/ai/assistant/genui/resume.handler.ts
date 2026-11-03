// assistant.resume (TIP-023c, nội bộ — ẩn khỏi find_actions, không agentGrantable): khối `qr` báo đã quét → kiểm phía server + biên nhận
// duy nhất (resume.ts) → ghi bước `tool` kết quả kết nối vào run để lượt kế tiếp của Trợ lý đọc (hỏi cấu hình nhanh). Không tự chạy
// model ở đây (không runner thứ hai trong request): FE gửi tiếp một lượt "đã kết nối" bằng session cũ; run nhận receipt làm ngữ cảnh.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, assistantResume } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { ChannelControl } from '../../../channels/services/control';
import { verifyExternal } from './resume';

type Out = { resumed: boolean; status: string };

@Injectable()
@ActionHandler('assistant.resume')
export class AssistantResumeHandler implements Handler<ActionInput<typeof assistantResume>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ChannelControl) private readonly control: ChannelControl | null = null,
  ) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantResume>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    // Người gọi phải là chủ run (không tin `onBehalfOf` từ client — actor là người dùng của request).
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    // Kết nối kênh là việc của channels.manage — quyền HIỆN HÀNH, không dựa quyền lúc tạo cây.
    if (!ctx.authz.isOwner && !ctx.authz.permissions.has('channels.manage')) return { result: { resumed: false, status: 'forbidden' } };
    const v = await verifyExternal(tx, this.control, { runId: i.run_id, node: i.node, channelAccountId: i.channel_account_id, attempt: i.attempt, userId }, this.clock.now());
    return { result: v.verified ? { resumed: true, status: 'connected' } : { resumed: false, status: v.status } };
  }
}
