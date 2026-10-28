// Handler giả cho action (chạy trên store in-memory). Policy chung nằm ở mock-transport; ở đây chỉ có nghiệp vụ.
import type { MockDb } from './store';

export interface MockHandler {
  execute(db: MockDb, input: never): unknown;
  undo?(db: MockDb, input: never): void;
  preview?(db: MockDb, input: never): { summary: string; count?: number };
}

export const mockHandlers: Record<string, MockHandler> = {
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
    execute: (db, input: { name?: string; locale?: string }) => {
      if (input.name) db.shell.me.user.name = input.name;
      if (input.locale) db.shell.me.user.locale = input.locale;
      return { user_id: db.shell.me.user.id };
    },
  },
};
