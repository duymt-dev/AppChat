// contact.duplicate_candidates (TIP-015e §1.1): ứng viên trùng theo scope hiện tại — cùng reader với GET /v1/contacts/duplicates/candidates.
import { Injectable } from '@nestjs/common';
import type { ActionInput, contactDuplicateCandidates } from '@appchat/actions';
import type { DuplicateCandidate } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { duplicateCandidates } from './candidates';

type Out = { data: DuplicateCandidate[]; next_cursor: string | null };

@Injectable()
@ActionHandler('contact.duplicate_candidates')
export class ContactDuplicateCandidatesHandler implements Handler<ActionInput<typeof contactDuplicateCandidates>, Out> {
  async execute(ctx: ActionContext, input: ActionInput<typeof contactDuplicateCandidates>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    return { result: await duplicateCandidates(tx, ctx.authz, input) };
  }
}
