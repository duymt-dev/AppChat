// campaign.mail_senders (TIP-012c §2.3): người gửi mail của DN dùng được cho chiến dịch email — quyền campaign.manage (không cần
// integrations.manage); chỉ định danh + trạng thái + lý do, không khoá / cấu hình. Cùng bộ đọc với GET /v1/campaigns/mail-senders.
import { Injectable } from '@nestjs/common';
import type { ActionInput, campaignMailSenders } from '@appchat/actions';
import type { MailSenderDto } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { listMailSenders } from '../services/mail-sender';

@Injectable()
@ActionHandler('campaign.mail_senders')
export class CampaignMailSendersHandler implements Handler<ActionInput<typeof campaignMailSenders>, { senders: MailSenderDto[] }> {
  async execute(_ctx: ActionContext, _input: ActionInput<typeof campaignMailSenders>, tx: TenantTx): Promise<HandlerOutcome<{ senders: MailSenderDto[] }>> {
    return { result: { senders: await listMailSenders(tx) } };
  }
}
