// Endpoint đọc của mock (Blueprint §4.2, §4.4). Thêm route khi làm màn tương ứng.
import { ROLE_DEFS } from '@appchat/shared';
import type { MockDb } from './store';

export type MockRoute = (db: MockDb, params: Record<string, unknown>) => unknown;

export const mockRoutes: Record<string, MockRoute> = {
  '/me': (db) => db.shell.me,
  '/me/authz': (db) => {
    const def = ROLE_DEFS[db.role];
    return { role: db.role, is_owner: db.role === 'owner', permissions: def.permissions, scope: def.scope, team_ids: [] };
  },
  '/notifications': (db) => ({
    data: db.readNotifications ? [] : db.shell.notifications,
    next_cursor: null,
  }),
  '/nav/badges': (db) => db.shell.nav_badges,
};
