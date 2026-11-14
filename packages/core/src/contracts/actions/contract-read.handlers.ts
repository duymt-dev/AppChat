// contract.search / contract.get (TIP-023b R2 · DC-224): Trợ lý / agent đọc hợp đồng. Cùng `listContractIds` (scope + chip như màn Hợp
// đồng) và `visibleContract` (ngoài scope → NOT_FOUND). Không trả tệp / link ký / token / nội dung điều khoản; giá trị là string VND.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, contractGet, contractSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { CrmMembers } from '../../crm/public';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { visibleContract, type ContractRecord } from '../contract-access';
import { listContractIds } from '../repos/contracts.repo';
import { contactsOf } from '../services/contract-view';

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const iso = (d: Date | null) => (d ? d.toISOString() : null);

function hit(c: ContractRecord, contact: string, people: Map<string, string>) {
  const name = (id: string | null) => (id ? (people.get(id) ?? '') : '');
  return { id: c.id, code: c.code, number: c.number, title: c.title, contact_id: c.contactId, contact, status: c.status, value: String(c.value), start_date: day(c.startDate), end_date: day(c.endDate), owner_user_id: c.ownerUserId, owner_name: name(c.ownerUserId), assigned_user_id: c.assignedUserId, assigned_name: name(c.assignedUserId), version: c.version };
}

type SearchOut = { contracts: ReturnType<typeof hit>[]; total: number };

@Injectable()
@ActionHandler('contract.search')
export class ContractSearchHandler implements Handler<ActionInput<typeof contractSearch>, SearchOut> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof contractSearch>, tx: TenantTx): Promise<HandlerOutcome<SearchOut>> {
    const f = { ...(i.q ? { q: i.q } : {}), ...(i.contact_id ? { contactId: i.contact_id } : {}), ...(i.status ? { status: i.status } : {}) };
    const { ids, total } = await listContractIds(tx, ctx.authz, f, { offset: 0, limit: i.limit ?? 10 });
    const rows = ids.length ? await tx.contract.findMany({ where: { id: { in: ids } } }) : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const [names, people] = await Promise.all([contactsOf(tx, rows.map((r) => r.contactId)), this.members.names(rows.flatMap((r) => [r.ownerUserId, r.assignedUserId]))]);
    const contracts = ids.flatMap((id) => {
      const c = byId.get(id);
      return c ? [hit(c, names.get(c.contactId)?.name ?? '', people)] : [];
    });
    return { result: { contracts, total } };
  }
}

@Injectable()
@ActionHandler('contract.get')
export class ContractGetHandler implements Handler<ActionInput<typeof contractGet>, unknown> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof contractGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const c = await visibleContract(tx, ctx.authz, i.contract_id);
    const [names, people] = await Promise.all([contactsOf(tx, [c.contactId]), this.members.names([c.ownerUserId, c.assignedUserId])]);
    // Phụ lục (TIP-030b F3) — đường tra id cho contract.appendix_* (cùng scope hợp đồng cha).
    const appendices = await tx.contractAppendix.findMany({ where: { contractId: c.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50, select: { id: true, code: true, title: true, status: true, version: true } });
    return {
      result: {
        ...hit(c, names.get(c.contactId)?.name ?? '', people),
        kind: c.kind,
        quote_id: c.quoteId,
        signed_by_business_at: iso(c.signedByBusinessAt),
        signed_by_customer_at: iso(c.signedByCustomerAt),
        sent_at: iso(c.sentAt),
        appendices,
      },
    };
  }
}
