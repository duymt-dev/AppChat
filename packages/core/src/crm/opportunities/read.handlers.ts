// contact_opportunity.list / .get (TIP-026c §2, §4.1) — cùng reader với GET /v1/contacts/:id/opportunities và GET /v1/opportunities/:id.
// Tên phụ trách qua CrmMembers (DB nền tảng); thiếu (unit test) → tên rỗng.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, contactOpportunityGet, contactOpportunityList } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler } from '../../kernel/actions/handler';
import { CrmMembers } from '../services/members.service';
import { listForContact, opportunityDetail, type OppReadCtx } from './read.service';

const ctxOf = (ctx: ActionContext, m: CrmMembers | null, now: Date): OppReadCtx => ({ authz: ctx.authz, names: (ids) => (m ? m.names(ids) : Promise.resolve(new Map())), now });

@Injectable()
@ActionHandler('contact_opportunity.list')
export class OpportunityListHandler implements Handler<ActionInput<typeof contactOpportunityList>, unknown> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}
  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunityList>, tx: TenantTx) {
    return { result: await listForContact(tx, input.contact_id, { cursor: input.cursor, limit: input.limit }, ctxOf(ctx, this.members, this.clock.now())) };
  }
}

@Injectable()
@ActionHandler('contact_opportunity.get')
export class OpportunityGetHandler implements Handler<ActionInput<typeof contactOpportunityGet>, unknown> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers | null,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}
  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunityGet>, tx: TenantTx) {
    return { result: await opportunityDetail(tx, input.opportunity_id, ctxOf(ctx, this.members, this.clock.now())) };
  }
}
