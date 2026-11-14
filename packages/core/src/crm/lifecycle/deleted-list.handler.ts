// contact.deleted_list (TIP-015f §1.4): đọc thùng rác theo scope hiện tại — cùng reader với GET /v1/contacts/deleted.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, contactDeletedList } from '@appchat/actions';
import type { DeletedContact } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { deletedContacts } from './read';

type Out = { data: DeletedContact[]; next_cursor: string | null };

@Injectable()
@ActionHandler('contact.deleted_list')
export class ContactDeletedListHandler implements Handler<ActionInput<typeof contactDeletedList>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contactDeletedList>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    return { result: await deletedContacts(tx, ctx.authz, input, this.clock.now()) };
  }
}
