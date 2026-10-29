// Endpoint đọc của mock (Blueprint §4.2, §4.4). Thêm route khi làm màn tương ứng.
import { ROLE_DEFS } from '@appchat/shared';
import type { MockDb } from './store';
import { dashboardRoutes } from './domains/dashboard';
import { inboxRoutes } from './domains/inbox';
import { customersRoutes } from './domains/customers';
import { assistantRoutes } from './domains/assistant';
import { agentsRoutes } from './domains/agents';
import { productsRoutes } from './domains/products';
import { quotesRoutes } from './domains/quotes';
import { contractsRoutes } from './domains/contracts';
import { ordersRoutes } from './domains/orders';
import { invoicesRoutes } from './domains/invoices';
import { calendarRoutes } from './domains/calendar';
import { ticketsRoutes } from './domains/tickets';
import { marketingRoutes } from './domains/marketing';
import { loyaltyRoutes } from './domains/loyalty';
import { settingsRoutes } from './domains/settings';
import { settingsAppsRoutes } from './domains/settings-apps';
import { settingsDataRoutes } from './domains/settings-data';
import { settingsAiRoutes } from './domains/settings-ai';

export type MockRoute = (db: MockDb, params: Record<string, unknown>) => unknown;

export const mockRoutes: Record<string, MockRoute> = {
  '/me': (db) => db.shell.me,
  '/me/authz': (db) => {
    const def = ROLE_DEFS[db.role];
    return {
      role: db.role,
      is_owner: db.role === 'owner',
      permissions: def.permissions,
      scope: def.scope,
      team_ids: [],
    };
  },
  '/notifications': (db) => ({
    data: db.readNotifications ? [] : db.shell.notifications,
    next_cursor: null,
  }),
  '/nav/badges': (db) => db.shell.nav_badges,
  // trialEndsAt = bắt đầu trial + 15 ngày (D-trial 15 ngày; prototype tính từ ac_trialstart)
  '/session': (db) => ({
    ...db.session,
    trialEndsAt: Date.parse(db.auth.trial.started_at) + db.auth.trial.days * 86_400_000,
  }),
  '/auth/brand': (db) => ({ card: db.auth.brand_card, stats: db.auth.brand_stats }),
  // GET /v1/workspaces/:id/provisioning — tenant.provision (D21); mock: lần hỏi đầu "running", lần sau "ready"
  '/workspace/provisioning': (db) => {
    const status = db.session.provisioned ? 'ready' : 'running';
    db.session.provisioned = true;
    return { status };
  },
  ...dashboardRoutes,
  ...inboxRoutes,
  ...customersRoutes,
  ...assistantRoutes,
  ...agentsRoutes,
  ...productsRoutes,
  ...quotesRoutes,
  ...contractsRoutes,
  ...ordersRoutes,
  ...invoicesRoutes,
  ...calendarRoutes,
  ...ticketsRoutes,
  ...marketingRoutes,
  ...loyaltyRoutes,
  ...settingsRoutes,
  ...settingsAppsRoutes,
  ...settingsDataRoutes,
  ...settingsAiRoutes,
};
