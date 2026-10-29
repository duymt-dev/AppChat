// Store in-memory của mock: nạp fixture prototype, ghi đè bởi mock action handler, phát sự kiện cho realtime giả.
import shell from '../../../../../../fixtures/prototype-parity/shell.json';
import type { SystemRole } from '@appchat/shared';

export type ShellFixture = typeof shell;

export interface MockDb {
  shell: ShellFixture;
  role: SystemRole;
  readNotifications: boolean;
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

const db: MockDb = { shell: structuredClone(shell), role: initialRole(), readNotifications: false };

type Listener = (event: string) => void;
const listeners = new Set<Listener>();

export const mockDb = () => db;

export const mutate = (fn: (d: MockDb) => void, event = 'mock.changed') => {
  fn(db);
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
