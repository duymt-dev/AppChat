// contact.set_stage (TIP-015g §2): kéo thẻ / Trợ lý / agent được cấp quyền đều qua đúng action này. Khoá họ khách gốc còn sống (015f) →
// quyền ghi hiện tại → đối chiếu if_version → đọc trên dòng đã khoá. Cùng giai đoạn = no-op thật (không mốc / version / lịch sử mới, không
// "gia hạn giữ"). Đổi thật: một UPDATE stage + mốc kéo tay + lần tương tác (đồng hồ đọc SAU khoá), trigger 025b tăng version đúng một lần;
// before / after ghi trường đã chạm (mốc dạng chữ UTC micro giây) + version sau-ghi thật + lifecycle_revision cho hoàn tác có điều kiện.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, contactSetStage } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { actorUserId, editableContact } from '../services/access';
import { lockContactVersion } from '../services/contact-version';
import { writeTimeline } from '../services/timeline.service';
import { lockFamily } from '../lifecycle/lock';
import * as pv from '../actions/previews/contact-write.handlers.preview';
import { fingerprint, stageSnap } from './snapshot';
import { moveStage, undoManualStage } from './undo';

type Out = { stage: string; version?: number };

@Injectable()
@ActionHandler('contact.set_stage')
export class ContactSetStageHandler implements Handler<ActionInput<typeof contactSetStage>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactSetStage>, tx: TenantTx) {
    return pv.setStagePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactSetStage>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    await editableContact(tx, ctx.authz, input.contact_id);
    await lockFamily(tx, input.contact_id);
    await editableContact(tx, ctx.authz, input.contact_id);
    const version = await lockContactVersion(tx, input.contact_id, input.if_version);
    const s = (await stageSnap(tx, input.contact_id))!;
    const before = { id: input.contact_id, changed: false, ...fingerprint(s), lifecycle_revision: s.lifecycle_revision };
    if (s.stage === input.stage) return { result: { stage: s.stage, version }, before, after: { ...before, version } };
    const now = this.clock.now();
    const next = await moveStage(tx, input.contact_id, version, { stage: input.stage, manual_at: now.toISOString(), last_at: now.toISOString() }, now);
    const a = (await stageSnap(tx, input.contact_id))!;
    await writeTimeline(tx, { contactId: input.contact_id, type: 'stage', key: 'stage', params: { from: s.stage, to: input.stage }, actor: { type: ctx.actor.type, id: actorUserId(ctx) }, at: now });
    return {
      result: { stage: input.stage, version: next },
      before: { ...before, changed: true },
      after: { id: input.contact_id, changed: true, version: next, lifecycle_revision: a.lifecycle_revision, ...fingerprint(a) },
      events: [{ topic: 'contact.stage_changed', payload: { contact_id: input.contact_id, from: s.stage, to: input.stage, manual: true } }],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoManualStage(ctx, log, tx, this.clock.now());
  }
}
