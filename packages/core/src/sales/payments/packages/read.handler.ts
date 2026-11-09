// package.list_for_contact (TIP-033b §1.3): Trợ lý / agent đọc liệu trình của khách qua PackagesRead (read.service.ts). Agent chỉ đọc khách
// trong quyền tool + quyền người ra lệnh (Executor); khách ngoài scope → 404. Không ghi, không tốn Credit ngoài lượt model.
import { Injectable } from '@nestjs/common';
import type { ActionInput, packageListForContact } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { listPackages } from './read.service';

type Out = Awaited<ReturnType<typeof listPackages>>;

@Injectable()
@ActionHandler('package.list_for_contact')
export class PackageListForContactHandler implements Handler<ActionInput<typeof packageListForContact>, Out> {
  async execute(ctx: ActionContext, i: ActionInput<typeof packageListForContact>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    return { result: await listPackages(tx, ctx.authz, { contactId: i.contact_id, status: i.status, serviceId: i.service_id, cursor: i.cursor, limit: i.limit }) };
  }
}
