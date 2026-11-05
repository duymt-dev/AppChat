// contract.resolve_suggestion (TIP-030b spec 11): Giữ / Bỏ một khối `ai_suggested` của hợp đồng NHÁP theo scope hiện hành. Khoá hợp đồng,
// CAS theo version của khối (người sau → CONFLICT kèm version hiện tại, không ghi đè im lặng). Khối đã Giữ vào nội dung ký lúc Duyệt & ký;
// khối Bỏ không bao giờ render. Đổi khối = đổi nội dung → thẻ xác nhận / ý định ký cũ không còn khớp input.
import { Inject, Injectable } from '@nestjs/common';
import { CONTRACT_FLOW, assertTransition } from '@appchat/shared';
import type { ActionInput, contractResolveSuggestion } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { preview, updated } from '../../kernel/actions/preview-kit';
import { CrmMembers } from '../../crm/public';
import { lockContract } from '../contract-access';
import { actorNameOf, logSignEvent } from '../services/contract-write';
import { resolveSuggestion, suggestionsOf } from '../files/suggestions';

type In = ActionInput<typeof contractResolveSuggestion>;
type Out = { contract_id: string; suggestion_id: string; status: 'kept' | 'discarded'; version: number; pending: number };

@Injectable()
@ActionHandler('contract.resolve_suggestion')
export class ContractResolveSuggestionHandler implements Handler<In, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    assertTransition(CONTRACT_FLOW, c.status, 'contract.update');
    const r = resolveSuggestion(suggestionsOf(c.aiSuggestions), input.suggestion_id, input.decision, input.if_version);
    const now = this.clock.now();
    await tx.contract.update({ where: { id: c.id }, data: { aiSuggestions: r.next as never, updatedAt: now } });
    await logSignEvent(tx, { contractId: c.id, type: r.status === 'kept' ? 'ai_suggestion_kept' : 'ai_suggestion_discarded', actorName: await actorNameOf(ctx, this.members), at: now });
    return { result: { contract_id: c.id, suggestion_id: input.suggestion_id, status: r.status, version: r.version, pending: r.pending } };
  }

  async preview(ctx: ActionContext, input: In, tx: TenantTx) {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    assertTransition(CONTRACT_FLOW, c.status, 'contract.update');
    const s = suggestionsOf(c.aiSuggestions).find((x) => x.id === input.suggestion_id);
    return preview('write', `${c.code} · ${(s?.text ?? '').slice(0, 80)}`, {
      changes: updated('contract', c.id, { [`suggestion.${input.suggestion_id}`]: s?.status ?? null }, { [`suggestion.${input.suggestion_id}`]: input.decision === 'keep' ? 'kept' : 'discarded' }),
    });
  }
}
