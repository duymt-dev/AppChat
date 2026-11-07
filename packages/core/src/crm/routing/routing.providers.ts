// Provider chia lead (TIP-042b): handler `lead_routing.update` / `lead_routing.apply` + service đọc cấu hình. Thiếu DB → service null.
import type { Provider } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { CrmMembers } from '../services/members.service';
import { LeadRoutingApplyHandler } from './routing-apply.handler';
import { LeadRoutingUpdateHandler } from './routing.handlers';
import { LeadRoutingReadService } from './routing-read.service';

export const ROUTING_HANDLERS = [LeadRoutingUpdateHandler, LeadRoutingApplyHandler];

export const ROUTING_PROVIDERS: Provider[] = [
  ...ROUTING_HANDLERS,
  {
    provide: LeadRoutingReadService,
    inject: [{ token: TENANT_RESOLVER, optional: true }, CrmMembers],
    useFactory: (r: TenantDbResolver | undefined, m: CrmMembers | null) => (r && m ? new LeadRoutingReadService(r, m) : null),
  },
];
