// Provider từ điển gợi ý danh mục (TIP-034b): handler 4 action (đọc / thay / gợi ý / xuất tệp) + ký cursor (khoá dẫn xuất từ APP_ENC_KEY)
// + đọc cho controller. Gắn vào SupportModule (API + ROLE=ai qua AiDomainHandlersModule + ROLE=jobs qua SupportJobsModule).
import { createHmac } from 'node:crypto';
import type { Provider } from '@nestjs/common';
import type { TenantDbResolver } from '@appchat/db';
import { ENC_KEY } from '../../kernel/crypto';
import { TENANT_RESOLVER } from '../../kernel/tenant/tenant.providers';
import { TicketCategoriesGetHandler, TicketCategoriesReplaceHandler, TicketCategorySuggestionsHandler } from './handlers';
import { CategoryCursors, TicketCategoriesRead } from './read';
import { TicketCategoriesExportHandler } from './export';

export const CATEGORY_HANDLERS = [TicketCategoriesGetHandler, TicketCategoriesReplaceHandler, TicketCategorySuggestionsHandler, TicketCategoriesExportHandler];

export const CATEGORY_PROVIDERS: Provider[] = [
  ...CATEGORY_HANDLERS,
  {
    provide: CategoryCursors,
    inject: [{ token: ENC_KEY, optional: true }],
    useFactory: (key: Buffer | undefined) => new CategoryCursors(key ? createHmac('sha256', key).update('derive:ticket-category-cursor').digest('hex') : null),
  },
  {
    provide: TicketCategoriesRead,
    inject: [{ token: TENANT_RESOLVER, optional: true }, CategoryCursors],
    useFactory: (t: TenantDbResolver | undefined, c: CategoryCursors) => (t ? new TicketCategoriesRead(t, c) : null),
  },
];
