// Store in-memory của mock: nạp fixture prototype, ghi đè bởi mock action handler, phát sự kiện cho realtime giả.
import shell from '../../../../../../fixtures/prototype-parity/shell.json';
import auth from '../../../../../../fixtures/prototype-parity/auth.json';
import type { SystemRole } from '@appchat/shared';
import { loadSession, saveSession, type MockSession } from './session';
import { createDashboardState, type DashboardState } from './domains/dashboard';
import { createInboxState, type InboxState } from './domains/inbox';
import { createCustomersState, type CustomersState } from './domains/customers';
import { createAssistantState, type AssistantState } from './domains/assistant';
import { createAgentsState, type AgentsState } from './domains/agents';
import { createProductsState, type ProductsState } from './domains/products';
import { createQuotesState, type QuotesState } from './domains/quotes';
import { createContractsState, type ContractsState } from './domains/contracts';
import { createOrdersState, type OrdersState } from './domains/orders';
import { createInvoicesState, type InvoicesState } from './domains/invoices';
import { createCalendarState, type CalendarState } from './domains/calendar';
import { createTicketsState, type TicketsState } from './domains/tickets';
import { createMarketingState, type MarketingState } from './domains/marketing';
import { createLoyaltyState, type LoyaltyState } from './domains/loyalty';
import { createSettingsState, type SettingsState } from './domains/settings';
import { createSettingsAppsState, type SettingsAppsState } from './domains/settings-apps';

export type ShellFixture = typeof shell;
export type AuthFixture = typeof auth;

export interface BusinessProfile {
  kind: 'business' | 'individual';
  tax_code?: string;
  id_number?: string;
  name: string;
  address: string;
  phone?: string;
  representative?: string;
  field: string;
}

export interface MockDb {
  shell: ShellFixture;
  auth: AuthFixture;
  role: SystemRole;
  readNotifications: boolean;
  session: MockSession;
  business: BusinessProfile | null;
  dashboard: DashboardState;
  inbox: InboxState;
  customers: CustomersState;
  assistant: AssistantState;
  agents: AgentsState;
  products: ProductsState;
  quotes: QuotesState;
  contracts: ContractsState;
  orders: OrdersState;
  invoices: InvoicesState;
  calendar: CalendarState;
  tickets: TicketsState;
  marketing: MarketingState;
  loyalty: LoyaltyState;
  settings: SettingsState;
  settingsApps: SettingsAppsState;
}

const ROLE_KEY = 'ac_mock_role';

const initialRole = (): SystemRole => {
  if (typeof window === 'undefined') return 'owner';
  try {
    return (window.localStorage.getItem(ROLE_KEY) as SystemRole | null) ?? 'owner';
  } catch {
    return 'owner';
  }
};

const db: MockDb = {
  shell: structuredClone(shell),
  auth: structuredClone(auth),
  role: initialRole(),
  readNotifications: false,
  session: loadSession(),
  business: null,
  dashboard: createDashboardState(),
  inbox: createInboxState(),
  customers: createCustomersState(),
  assistant: createAssistantState(),
  agents: createAgentsState(),
  products: createProductsState(),
  quotes: createQuotesState(),
  contracts: createContractsState(),
  orders: createOrdersState(),
  invoices: createInvoicesState(),
  calendar: createCalendarState(),
  tickets: createTicketsState(),
  marketing: createMarketingState(),
  loyalty: createLoyaltyState(),
  settings: createSettingsState(),
  settingsApps: createSettingsAppsState(),
};

type Listener = (event: string) => void;
const listeners = new Set<Listener>();

export const mockDb = () => db;

export const mutate = (fn: (d: MockDb) => void, event = 'mock.changed') => {
  fn(db);
  saveSession(db.session);
  db.shell.me.billing.trial_days_left = db.session.trialDaysLeft;
  for (const l of listeners) l(event);
};

export const onMockEvent = (l: Listener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const setMockRole = (role: SystemRole) => {
  try {
    window.localStorage.setItem(ROLE_KEY, role);
  } catch {
    /* localStorage có thể bị chặn — vai trò chỉ giữ trong phiên */
  }
  mutate((d) => {
    d.role = role;
  }, 'authz.changed');
};

db.shell.me.billing.trial_days_left = db.session.trialDaysLeft;
