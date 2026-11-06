// Endpoint đọc của mock (Blueprint §4.2, §4.4). Thêm route khi làm màn tương ứng.
import { ROLE_DEFS } from '@appchat/shared';
import type { MockDb } from './store';
import { dashboardRoutes } from './domains/dashboard';
import { inboxRoutes } from './domains/inbox';
import { customersRoutes } from './domains/customers';
import { assistantRoutes } from './domains/assistant';
import { assistantSessionRoutes } from './domains/assistant-sessions';
import { aiTasksRoutes } from './domains/ai-tasks';
import { agentsRoutes } from './domains/agents';
import { productsRoutes } from './domains/products';
import { quotesRoutes } from './domains/quotes';
import { contractsRoutes } from './domains/contracts';
import { ordersRoutes } from './domains/orders';
import { invoicesRoutes } from './domains/invoices';
import { invoicesActionRoutes } from './domains/invoices-actions';
import { calendarRoutes } from './domains/calendar';
import { ticketsRoutes } from './domains/tickets';
import { marketingRoutes } from './domains/marketing';
import { loyaltyRoutes } from './domains/loyalty';
import { settingsRoutes } from './domains/settings';
import { authzMgmtRoutes } from './domains/authz-management';
import { leadRoutingRoutes } from './domains/lead-routing';
import { settingsAppsRoutes } from './domains/settings-apps';
import { profileLayoutRoutes } from './domains/profile-layout';
import { settingsDataRoutes } from './domains/settings-data';
import { settingsAiRoutes } from './domains/settings-ai';
import { auditRoutes } from './domains/audit';
import { kbSuggestionRoutes } from './domains/kb-suggestions';
import { settingsOpsRoutes } from './domains/settings-ops';
import { settingsBillingRoutes } from './domains/settings-billing';
import { platformAdminRoutes } from './domains/platform-admin';
import { docTemplatesRoutes } from './domains/doc-templates';
import { withCustomFilters } from './domains/custom-values';

export type MockRoute = (db: MockDb, params: Record<string, unknown>) => unknown;

export const mockRoutes: Record<string, MockRoute> = withCustomFilters({
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
  ...assistantSessionRoutes,
  ...aiTasksRoutes,
  ...agentsRoutes,
  ...productsRoutes,
  ...quotesRoutes,
  ...contractsRoutes,
  ...ordersRoutes,
  ...invoicesRoutes,
  ...invoicesActionRoutes,
  ...calendarRoutes,
  ...ticketsRoutes,
  ...marketingRoutes,
  ...loyaltyRoutes,
  ...settingsRoutes,
  ...authzMgmtRoutes,
  ...leadRoutingRoutes,
  ...settingsAppsRoutes,
  ...profileLayoutRoutes,
  ...settingsDataRoutes,
  ...settingsAiRoutes,
  ...auditRoutes,
  ...kbSuggestionRoutes,
  ...settingsOpsRoutes,
  ...settingsBillingRoutes,
  ...platformAdminRoutes,
  ...docTemplatesRoutes,
});
