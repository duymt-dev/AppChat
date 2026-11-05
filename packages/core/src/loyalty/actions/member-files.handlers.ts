// loyalty.attach_file (TIP-036 mục 4): gắn tệp vừa tải (transport.upload purpose attachment) vào hồ sơ thành viên. Quyền `crm.edit` +
// khách trong scope và không phải người chỉ theo dõi (editableContact); tệp phải do chính người gọi tải lên, chưa gắn ở đâu. Hoàn tác 24h
// gỡ liên kết (tệp giữ trong storage như mọi tệp đính kèm).
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, ActionPreview, loyaltyAttachFile } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { actorUserId, editableContact } from '../../crm/public';
import { attachableFile } from '../services/member-files.service';

type In = ActionInput<typeof loyaltyAttachFile>;
type Out = { contact_id: string; file_id: string; name: string };

@Injectable()
@ActionHandler('loyalty.attach_file')
export class LoyaltyAttachFileHandler implements Handler<In, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { contact } = await editableContact(tx, ctx.authz, i.contact_id);
    const me = actorUserId(ctx);
    if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    const f = await attachableFile(tx, i.file_id, me);
    const now = this.clock.now();
    await tx.loyaltyMemberFile.create({ data: { contactId: contact.id, fileId: f.id, createdBy: me, createdAt: now } });
    await tx.file.updateMany({ where: { id: f.id }, data: { confirmed: true } });
    return { result: { contact_id: contact.id, file_id: f.id, name: f.name }, before: { contact_id: contact.id, file_id: f.id } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { contact_id: string; file_id: string };
    const n = await tx.loyaltyMemberFile.deleteMany({ where: { contactId: b.contact_id, fileId: b.file_id } });
    if (!n.count) throw new AppError('CONFLICT', 409, { file_id: 'changed' });
  }

  async preview(ctx: ActionContext, i: In, tx: TenantTx): Promise<ActionPreview> {
    const { contact } = await editableContact(tx, ctx.authz, i.contact_id);
    const f = await attachableFile(tx, i.file_id, actorUserId(ctx) ?? '');
    return preview('write', line(contact.code, contact.name, f.name), { changes: [{ entity: 'loyalty_member', id: contact.id, before: {}, after: { file: f.name } }] });
  }
}
