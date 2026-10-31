// Handler giả cho action (chạy trên store in-memory). Policy chung nằm ở mock-transport; ở đây chỉ có nghiệp vụ.
import type { MockDb } from './store';
import { dashboardHandlers } from './domains/dashboard';
import { inboxHandlers } from './domains/inbox';
import { customersHandlers } from './domains/customers';
import { assistantHandlers } from './domains/assistant';
import { agentsHandlers } from './domains/agents';
import { productsHandlers } from './domains/products';
import { quotesHandlers } from './domains/quotes-actions';
import { contractsHandlers } from './domains/contracts-actions';
import { ordersHandlers } from './domains/orders';
import { invoicesHandlers } from './domains/invoices';
import { calendarHandlers } from './domains/calendar';
import { ticketsHandlers } from './domains/tickets';
import { marketingHandlers } from './domains/marketing';
import { loyaltyHandlers } from './domains/loyalty';
import { settingsHandlers } from './domains/settings';
import { settingsAppsHandlers } from './domains/settings-apps';
import { profileLayoutHandlers } from './domains/profile-layout';
import { settingsDataHandlers } from './domains/settings-data';
import { settingsAiHandlers } from './domains/settings-ai';
import { settingsOpsHandlers } from './domains/settings-ops';
import { settingsBillingHandlers } from './domains/settings-billing';
import { docTemplatesHandlers } from './domains/doc-templates';
import { withCustomValues } from './domains/custom-values';

export interface MockHandler {
  execute(db: MockDb, input: never): unknown;
  undo?(db: MockDb, input: never): void;
  preview?(db: MockDb, input: never): { summary: string; count?: number };
}

export const mockHandlers: Record<string, MockHandler> = withCustomValues({
  'business_profile.update': {
    execute: (
      db,
      input: {
        kind: 'enterprise' | 'household' | 'individual';
        tax_code?: string;
        national_id?: string;
        legal_name: string;
        address: string;
        phone?: string;
        representative?: string;
        business_description: string;
      },
    ) => {
      db.business = {
        kind: input.kind === 'individual' ? 'individual' : 'business',
        tax_code: input.tax_code,
        id_number: input.national_id,
        name: input.legal_name,
        address: input.address,
        phone: input.phone,
        representative: input.representative,
        field: input.business_description,
      };
      db.session.declared = true;
      db.session.provisioned = false;
      return { workspace_id: db.shell.me.current_workspace_id, declared_at: new Date().toISOString() };
    },
  },
  'notification.mark_read': {
    execute: (db) => {
      const updated = db.readNotifications ? 0 : db.shell.notifications.length;
      db.readNotifications = true;
      return { updated };
    },
  },
  'workspace.switch': {
    execute: (db, input: { workspace_id: string }) => {
      db.shell.me.current_workspace_id = input.workspace_id;
      return { workspace_id: input.workspace_id };
    },
  },
  'profile.update': {
    execute: (db, input: { name?: string; phone?: string; locale?: string }) => {
      if (input.name) db.shell.me.user.name = input.name;
      if (input.phone !== undefined) db.shell.me.user.phone = input.phone;
      if (input.locale) db.shell.me.user.locale = input.locale;
      return { user_id: db.shell.me.user.id };
    },
  },
  ...dashboardHandlers,
  ...inboxHandlers,
  ...customersHandlers,
  ...assistantHandlers,
  ...agentsHandlers,
  ...productsHandlers,
  ...quotesHandlers,
  ...contractsHandlers,
  ...ordersHandlers,
  ...invoicesHandlers,
  ...calendarHandlers,
  ...ticketsHandlers,
  ...marketingHandlers,
  ...loyaltyHandlers,
  ...settingsHandlers,
  ...settingsAppsHandlers,
  ...profileLayoutHandlers,
  ...settingsDataHandlers,
  ...settingsAiHandlers,
  ...settingsOpsHandlers,
  ...settingsBillingHandlers,
  ...docTemplatesHandlers,
});
