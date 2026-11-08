// `contact.transfer_owner` (TIP-015d, D32): một transaction tenant — khách + hội thoại / báo giá / lịch hẹn được chọn + biên nhận + timeline
// + outbox (transfer.service). Nguồn Trợ lý / agent / tác vụ luôn qua duyệt thật (`requiredApprovalSources` của ActionDef — executor), thẻ
// xác nhận không thay được. Người nhận đã là người phụ trách → `skipped_already_owner` (không biên nhận, không thông báo, không hoàn tác).
// Hoàn tác = lần chuyển mới nhất, tất cả hoặc 409 (transfer-undo).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, contactTransferOwner } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { actorUserId } from '../services/access';
import { ownerChangedNotify } from '../services/crm-notify';
import { CrmMembers } from '../services/members.service';
import { transferOwnerPreview } from '../actions/previews/contact-owner.handlers.preview';
import { transferContact, type TransferResult } from './transfer.service';
import { undoTransfer } from './transfer-undo';

type In = ActionInput<typeof contactTransferOwner>;

@Injectable()
@ActionHandler('contact.transfer_owner')
export class ContactTransferOwnerHandler implements Handler<In, TransferResult> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    return transferOwnerPreview(tx, ctx.authz, this.members, input, this.clock.now());
  }

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<TransferResult>> {
    const to = await this.members.assertMember(ctx.workspaceId, input.to_user_id, 'to_user_id');
    const o = await transferContact(ctx, tx, input, to, this.clock.now());
    if (o.result.status === 'skipped_already_owner') return { result: o.result, noUndo: true };
    return {
      result: o.result,
      before: { id: o.contact.id, transfer_id: o.result.transfer_id },
      after: { id: o.contact.id, owner: to.id, transfer_id: o.result.transfer_id },
      // Người nhận được thông báo `crm_owner` (DC-150).
      events: [...o.events, ...(await ownerChangedNotify(this.members, { actorId: actorUserId(ctx), to: to.id, contact: o.contact }))],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { transfer_id?: string };
    // Log trước TIP-015d (chưa có biên nhận) không hoàn tác được an toàn theo luật mới.
    if (!b.transfer_id) throw new AppError('UNDO_NOT_SUPPORTED', 409, { transfer: 'legacy' });
    const now = this.clock.now();
    const r = await undoTransfer(ctx, tx, b.transfer_id, { isActiveMember: (ws, u) => this.members.assertMember(ws, u, 'from_user_id').then(() => true, () => false) }, now);
    await writeOutbox(tx, ctx.workspaceId, r.events, now);
  }
}
