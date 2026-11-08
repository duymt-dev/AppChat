// contact.delete (TIP-015f §1.1/§1.3): crm.delete, risk delete, không cấp agent, hoàn tác 30 ngày. Xem trước + xác nhận gắn version hiện
// tại + thế hệ vòng đời + tóm tắt phụ thuộc. Xoá lại cùng thế hệ = bỏ qua (giữ biên nhận / hạn, không event / undo mới). Hoàn tác log = cùng
// dịch vụ khôi phục (quyền hiện tại + đúng thế hệ đã xoá) — biên nhận log cũ không có thế hệ → 409.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, can } from '@appchat/shared';
import type { ActionInput, ActionPreview, contactDelete } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { preview, removed } from '../../kernel/actions/preview-kit';
import { uuidv7 } from '../../kernel/ids';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { accessOf, actorUserId } from '../services/access';
import { assertDeleteAuthority } from './authority';
import { familyDependencies } from './dependencies';
import { lockFamily } from './lock';
import { deleteContact, restoreContact, type DeleteOutcome } from './service';

type Out = DeleteOutcome['result'];

@Injectable()
@ActionHandler('contact.delete')
export class ContactDeleteHandler implements Handler<ActionInput<typeof contactDelete>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactDelete>, tx: TenantTx): Promise<ActionPreview> {
    const fam = await lockFamily(tx, input.contact_id);
    const c = fam.root;
    if (c.deletedAt) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    assertDeleteAuthority(ctx.authz, c, !!(await accessOf(tx, ctx.authz, c)));
    if (input.if_version !== undefined && c.version !== input.if_version) throw new AppError('STALE_VERSION', 409, { if_version: 'stale' });
    const deps = await familyDependencies(tx, fam.ids);
    const block = deps.filter((d) => d.level === 'block');
    if (block.length) throw new AppError('HAS_DEPENDENCIES', 409, Object.fromEntries(block.map((d) => [d.kind, String(d.count)])));
    const warnings = deps.map((d) => `${d.kind}:${d.count}`);
    return preview('delete', `${c.code} · ${c.name}`, {
      changes: [removed('contact', c.id, { code: c.code, name: c.name, version: c.version, lifecycle_revision: c.lifecycleRevision })],
      ...(warnings.length ? { warnings } : {}),
    });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactDelete>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const op = ctx.idempotencyKey ? `contact.delete:${ctx.idempotencyKey}` : `contact.delete:${uuidv7(now.getTime())}`;
    const r = await deleteContact(tx, ctx.authz, { contactId: input.contact_id, ifVersion: input.if_version, operationId: op, actorUserId: actorUserId(ctx), now });
    if (r.noop) return { result: r.result, noUndo: true };
    return {
      result: r.result,
      before: { id: input.contact_id, receipt_id: r.receipt.id, lifecycle_revision: r.receipt.lifecycleRevision },
      after: { id: input.contact_id, deleted: true, version: r.result.version },
      events: r.events,
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; lifecycle_revision?: number };
    // Log trước TIP-015f không có thế hệ xoá → không đoán (409).
    if (b.lifecycle_revision === undefined) throw new AppError('CONFLICT', 409, { receipt: 'legacy' });
    // Quyền hiện tại (không hồi sinh quyền đã mất từ lúc xoá).
    if (!can(ctx.authz, 'crm.delete')) throw new AppError('FORBIDDEN', 403, { permission: 'crm.delete' });
    const now = this.clock.now();
    const r = await restoreContact(tx, ctx.authz, { contactId: b.id, generation: b.lifecycle_revision, actorUserId: actorUserId(ctx), now });
    await writeOutbox(tx, ctx.workspaceId, r.events, now);
  }
}
