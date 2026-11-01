// contact.search (agent / Trợ lý): tìm khách theo tên / SĐT / email / mã KH, lọc giai đoạn / nhóm — cùng điều kiện + scope với danh sách
// Khách hàng (`listContactIds`, index trigram f_unaccent(name) / phone_norm / code), trả id + mã để gọi action khác.
import { Injectable } from '@nestjs/common';
import type { ActionInput, contactSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { listContactIds } from '../repos/contacts.repo';

type Out = { contacts: { id: string; code: string; name: string; phone: string | null; email: string | null; stage: string }[]; total: number };

@Injectable()
@ActionHandler('contact.search')
export class ContactSearchHandler implements Handler<ActionInput<typeof contactSearch>, Out> {
  async execute(ctx: ActionContext, i: ActionInput<typeof contactSearch>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { ids, total } = await listContactIds(tx, ctx.authz, { ...(i.q ? { q: i.q } : {}), ...(i.stage ? { stage: i.stage } : {}), ...(i.group ? { group: i.group } : {}) }, { offset: 0, limit: i.limit ?? 10 });
    const rows = await tx.contact.findMany({ where: { id: { in: ids } }, select: { id: true, code: true, name: true, phone: true, email: true, stage: true } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const contacts = ids.flatMap((id) => {
      const r = byId.get(id);
      return r ? [{ id: r.id, code: r.code, name: r.name, phone: r.phone, email: r.email, stage: r.stage }] : [];
    });
    return { result: { contacts, total } };
  }
}
