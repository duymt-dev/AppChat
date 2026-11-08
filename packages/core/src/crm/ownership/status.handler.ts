// `contact.transfer_status` (TIP-015d §2.8): đọc lần chuyển phụ trách đã commit — cùng reader với HTTP (read.ts).
import { Injectable } from '@nestjs/common';
import type { ActionInput, contactTransferStatus } from '@appchat/actions';
import type { ContactTransferStatusDto } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { transferStatus } from './read';

type In = ActionInput<typeof contactTransferStatus>;

@Injectable()
@ActionHandler('contact.transfer_status')
export class ContactTransferStatusHandler implements Handler<In, ContactTransferStatusDto> {
  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<ContactTransferStatusDto>> {
    return { result: await transferStatus(tx, ctx.authz, input.contact_id, input.transfer_id, { cursor: input.cursor, limit: input.limit }) };
  }
}
