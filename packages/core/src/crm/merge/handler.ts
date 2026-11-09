// contact.merge (crm.edit, bulk → luôn xem trước, không cấp agent, hoàn tác 7 ngày có điều kiện — TIP-015e §2): `group_ids` = cặp
// `<chính>~<phụ>`; `expected_versions` (tuỳ chọn) = { contact_id: version } người dùng đã xem — lệch → 409. Cặp cùng bản chính gộp chung một
// đơn vị. Xem trước kiểm CÙNG điều kiện với thực thi (sống, ghi được, cùng chủ + ACL, phiên bản) và chỉ trả số đếm theo quyền. Không hợp
// quyền / không thêm collaborator. Hoàn tác theo biên nhận `contact_merge_receipt` (log cũ trước TIP không có biên nhận → 409).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionPreview, ActionInput, contactMerge } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { preview, type Change } from '../../kernel/actions/preview-kit';
import { UUID, actorUserId } from '../services/access';
import { planMerge } from '../memory/merge';
import { lockFamily } from '../lifecycle/lock';
import { assertMergeable } from './authority';
import { fillOf, relationCounts } from './relations';
import { mergeUnit, undoMerge, unitsOf, type Unit } from './service';

type Input = ActionInput<typeof contactMerge>;
type Out = { merged: number };

function units(ids: string[]): Unit[] {
  return unitsOf(
    ids.map((g) => {
      const [a, b] = g.split('~');
      if (!a || !b || !UUID.test(a) || !UUID.test(b)) throw new AppError('VALIDATION_FAILED', 422, { group_ids: 'invalid' });
      return [a, b] as const;
    }),
  );
}

@Injectable()
@ActionHandler('contact.merge')
export class ContactMergeHandler implements Handler<Input, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: Input, tx: TenantTx): Promise<ActionPreview> {
    const changes: Change[] = [];
    for (const u of units(input.group_ids)) {
      const families = new Map<string, string[]>();
      const roots = new Map<string, Awaited<ReturnType<typeof lockFamily>>['root']>();
      for (const id of [u.primary, ...u.sources].sort()) {
        const f = await lockFamily(tx, id);
        families.set(id, f.ids);
        roots.set(id, f.root);
      }
      const p = roots.get(u.primary)!;
      const srcs = u.sources.map((s) => roots.get(s)!);
      await assertMergeable(tx, ctx.authz, p, srcs, families, input.expected_versions);
      for (const d of srcs) changes.push({ entity: 'contact', id: d.id, before: { code: d.code, name: d.name }, after: { merged_into: p.code, ...(await relationCounts(tx, [d.id])), memory: await planMerge(tx, p.id, d.id) } });
      const fill = fillOf(p, srcs);
      if (Object.keys(fill).length) changes.push({ entity: 'contact', id: p.id, before: Object.fromEntries(Object.keys(fill).map((k) => [k, null])), after: fill });
    }
    return preview('write', `${input.group_ids.length}`, { count: input.group_ids.length, changes });
  }

  async execute(ctx: ActionContext, input: Input, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const done = [];
    for (const u of units(input.group_ids)) done.push(await mergeUnit(tx, ctx.authz, u, { actorUserId: actorUserId(ctx), actorType: ctx.actor.type, now, expected: input.expected_versions }));
    return {
      result: { merged: done.reduce((n, d) => n + d.sources.length, 0) },
      before: { receipts: done.map((d) => d.receiptId) },
      events: done.map((d) => ({ topic: 'contact.merged', payload: { contact_id: d.primary, merged_ids: d.sources } })),
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const receipts = (log.before as { receipts?: string[] } | null)?.receipts;
    if (!receipts?.length) throw new AppError('UNDO_NOT_SUPPORTED', 409, { merge: 'legacy' });
    const now = this.clock.now();
    for (const id of [...receipts].reverse()) await undoMerge(tx, ctx.authz, id, now);
  }
}
