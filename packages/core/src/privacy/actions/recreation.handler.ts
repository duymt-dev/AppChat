// contact.allow_recreation (TIP-015c §1.3 point 6, §4.1, pha 3) — permit một lần mở lại khả năng contact.create từ định danh đã
// tombstone. Yêu cầu TOÀN BỘ định danh khai đều đang tombstoned (chưa xin nhầm tập chưa từng quên) — không phục hồi dữ liệu cũ, chỉ
// mở khoá tạo MỚI. intent_hash chốt đúng create_input gửi kèm — contact.create sau đó phải gửi lại đúng input này (permit-consumption
// pha sau) khớp hash mới tiêu được, tránh permit bị dùng cho một tạo khác với ý định ban đầu.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, contactAllowRecreation } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { ENC_KEY } from '../../kernel/crypto';
import { hashInput } from '../../kernel/actions/confirm-token';
import { preview } from '../../kernel/actions/preview-kit';
import { allTombstoned, issueRecreationPermit, type RecreationIdentifier } from '../services/recreation';

type Input = ActionInput<typeof contactAllowRecreation>;
type Output = { permit_id: string; expires_at: string };

@Injectable()
@ActionHandler('contact.allow_recreation')
export class ContactAllowRecreationHandler implements Handler<Input, Output> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ENC_KEY) private readonly encKey: Buffer | null = null,
  ) {}

  async preview(_ctx: ActionContext, i: Input, tx: TenantTx): Promise<ActionPreview> {
    const ids = i.identifiers as RecreationIdentifier[];
    if (!(await allTombstoned(tx, this.encKey, ids))) throw new AppError('VALIDATION_FAILED', 422, { identifiers: 'not_all_tombstoned' });
    const name = typeof i.create_input.full_name === 'string' ? i.create_input.full_name : '';
    return preview('config', `hồ sơ mới · ${name || ids.map((d) => d.value).join(', ')}`, { warnings: ['no_restore', `identifiers:${ids.length}`] });
  }

  async execute(ctx: ActionContext, i: Input, tx: TenantTx): Promise<HandlerOutcome<Output>> {
    const ids = i.identifiers as RecreationIdentifier[];
    if (!(await allTombstoned(tx, this.encKey, ids))) throw new AppError('VALIDATION_FAILED', 422, { identifiers: 'not_all_tombstoned' });
    const now = this.clock.now();
    const intentHash = hashInput(i.create_input);
    const r = await issueRecreationPermit(tx, { actorUserId: ctx.onBehalfOfUserId ?? ctx.actor.id, identifiers: ids, intentHash, now });
    return { result: { permit_id: r.id, expires_at: r.expiresAt.toISOString() }, noUndo: true };
  }
}
