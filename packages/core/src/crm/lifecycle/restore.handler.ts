// contact.restore (TIP-015f §1.4–§1.5): crm.delete, risk write, không cấp agent; xem trước + xác nhận cho Trợ lý. Khôi phục khi còn hạn
// (trước deleted_at + 30 × 24h), đúng thế hệ xoá hiện tại, đủ điều kiện xoá hiện tại, không có khách sống trùng SĐT, không phải nguồn gộp.
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, contactRestore } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { preview, updated } from '../../kernel/actions/preview-kit';
import { accessOf, actorUserId } from '../services/access';
import { assertDeleteAuthority } from './authority';
import { lockFamily } from './lock';
import { currentReceipt, receiptStatus } from './receipts';
import { restoreContact } from './service';

type Out = { contact_id: string; version: number };

@Injectable()
@ActionHandler('contact.restore')
export class ContactRestoreHandler implements Handler<ActionInput<typeof contactRestore>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactRestore>, tx: TenantTx): Promise<ActionPreview> {
    const { root: c } = await lockFamily(tx, input.contact_id);
    if (!c.deletedAt) throw new AppError('INVALID_STATE', 409, { contact_id: 'not_deleted' });
    assertDeleteAuthority(ctx.authz, c, !!(await accessOf(tx, ctx.authz, c)));
    if (input.if_version !== undefined && c.version !== input.if_version) throw new AppError('STALE_VERSION', 409, { if_version: 'stale' });
    const r = await currentReceipt(tx, c.id, c.lifecycleRevision);
    const st = receiptStatus(r, this.clock.now());
    if (st === 'expired') throw new AppError('INVALID_STATE', 409, { contact_id: 'restore_expired' });
    if (st === 'blocked') throw new AppError('CONFLICT', 409, { receipt: r ? r.state : 'missing' });
    return preview('write', `${c.code} · ${c.name}`, {
      changes: updated('contact', c.id, { deleted_at: c.deletedAt.toISOString() }, { deleted_at: null }),
      warnings: ['connector_sync_may_resume'],
    });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactRestore>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const r = await restoreContact(tx, ctx.authz, { contactId: input.contact_id, ifVersion: input.if_version, actorUserId: actorUserId(ctx), now: this.clock.now() });
    return { result: r.result, events: r.events };
  }
}
