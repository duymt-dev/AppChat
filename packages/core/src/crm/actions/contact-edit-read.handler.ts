// contact.get_edit_context (TIP-025b §D.3) — đọc ngữ cảnh form sửa khách qua executor (Trợ lý / form toàn cục); cùng reader với
// `GET /v1/contacts/:id/edit-context`.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, ActionPreview, contactGetEditContext } from '@appchat/actions';
import type { ContactEditContextDto } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { CrmMembers } from '../services/members.service';
import { contactEditContext } from '../services/contact-edit';

@Injectable()
@ActionHandler('contact.get_edit_context')
export class ContactEditContextHandler implements Handler<ActionInput<typeof contactGetEditContext>, ContactEditContextDto> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof contactGetEditContext>, tx: TenantTx): Promise<HandlerOutcome<ContactEditContextDto>> {
    return { result: await contactEditContext(tx, ctx.authz, i.contact_id, (ids) => this.members.names(ids)) };
  }

  async preview(ctx: ActionContext, i: ActionInput<typeof contactGetEditContext>, tx: TenantTx): Promise<ActionPreview> {
    const r = await contactEditContext(tx, ctx.authz, i.contact_id, async () => new Map());
    return preview('read', line(r.code), { count: 1 });
  }
}
