// Mock Hồ sơ 360° — bố cục theo mẫu & vai trò (REQ-F12, M05; prototype L690–735, L8631–8653, L6397–6415).
// GET /settings/profile-layouts → { layouts, role_assignments }. Ghi qua profile_layout.* (packages/actions/src/settings-apps.ts).
import { ApiRequestError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export interface LayoutTab {
  key: string;
  label: string;
  enabled: boolean;
  sort: number;
  builtin: boolean;
  blocks: string[];
}

export interface ProfileLayout {
  id: string;
  name: string;
  is_system: boolean;
  tabs: LayoutTab[];
  created_by: string;
}

export type SystemRoleKey = 'owner' | 'manager' | 'sales' | 'cs' | 'accountant';

export interface ProfileLayoutState {
  layouts: ProfileLayout[];
  /** role_key → layout_id (profile_layout_role, pk theo role). */
  roleAssignments: Record<SystemRoleKey, string>;
  seq: number;
}

/** 5 tab mặc định của prototype p360Default() B(). */
const BUILTIN_TABS = (): LayoutTab[] =>
  (['overview', 'crm', 'ai', 'files', 'history'] as const).map((k, i) => ({
    key: k,
    label: { overview: 'Tổng quan', crm: 'CRM', ai: 'AI', files: 'Tệp', history: 'Lịch sử' }[k],
    enabled: true,
    sort: i,
    builtin: true,
    blocks: [],
  }));

export const createProfileLayoutState = (): ProfileLayoutState => ({
  layouts: [
    { id: 'pl_default', name: 'Mặc định workspace', is_system: true, tabs: BUILTIN_TABS(), created_by: 'Hệ thống' },
    {
      id: 'pl_cskh',
      name: 'CSKH',
      is_system: true,
      tabs: [...BUILTIN_TABS(), { key: 'cs', label: 'CSKH', enabled: true, sort: 5, builtin: false, blocks: ['ticket', 'sla', 'csat', 'careNote'] }],
      created_by: 'Hệ thống',
    },
    {
      id: 'pl_sales',
      name: 'Kinh doanh',
      is_system: true,
      tabs: [
        { key: 'overview', label: 'Tổng quan', enabled: true, sort: 0, builtin: true, blocks: [] },
        { key: 'deals', label: 'Giao dịch', enabled: true, sort: 1, builtin: false, blocks: ['quotes', 'orders', 'appts'] },
        { key: 'crm', label: 'CRM', enabled: true, sort: 2, builtin: true, blocks: [] },
        { key: 'ai', label: 'AI', enabled: true, sort: 3, builtin: true, blocks: [] },
        { key: 'files', label: 'Tệp', enabled: false, sort: 4, builtin: true, blocks: [] },
        { key: 'history', label: 'Lịch sử', enabled: true, sort: 5, builtin: true, blocks: [] },
      ],
      created_by: 'Hệ thống',
    },
  ],
  roleAssignments: { owner: 'pl_default', manager: 'pl_default', sales: 'pl_sales', cs: 'pl_cskh', accountant: 'pl_default' },
  seq: 0,
});

const layout = (db: MockDb, id: string) => {
  const l = db.profileLayout.layouts.find((x) => x.id === id);
  if (!l) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return l;
};

export const profileLayoutRoutes: Record<string, MockRoute> = {
  '/settings/profile-layouts': (db) => ({
    layouts: db.profileLayout.layouts.map((l) => ({
      ...l,
      roles: (Object.keys(db.profileLayout.roleAssignments) as SystemRoleKey[]).filter(
        (r) => db.profileLayout.roleAssignments[r] === l.id,
      ),
    })),
    role_assignments: db.profileLayout.roleAssignments,
  }),
};

export const profileLayoutHandlers: Record<string, MockHandler> = {
  'profile_layout.create': {
    execute: (db, i: { name: string; tabs: LayoutTab[] }) => {
      const id = `pl_${++db.profileLayout.seq}`;
      db.profileLayout.layouts.push({ id, name: i.name, is_system: false, tabs: i.tabs, created_by: 'Bạn' });
      return { layout_id: id };
    },
  },
  'profile_layout.update': {
    execute: (db, i: { layout_id: string; patch: { name?: string; tabs?: LayoutTab[] } }) => {
      const l = layout(db, i.layout_id);
      if (i.patch.tabs && !i.patch.tabs.some((t) => t.enabled)) {
        throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'at_least_one_tab', fields: { tabs: 'at_least_one_tab' } });
      }
      Object.assign(l, i.patch);
      return { layout_id: l.id };
    },
  },
  'profile_layout.duplicate': {
    execute: (db, i: { layout_id: string }) => {
      const src = layout(db, i.layout_id);
      const id = `pl_${++db.profileLayout.seq}`;
      db.profileLayout.layouts.push({ id, name: `${src.name} (bản sao)`, is_system: false, tabs: structuredClone(src.tabs), created_by: 'Bạn' });
      return { layout_id: id };
    },
  },
  'profile_layout.delete': {
    execute: (db, i: { layout_id: string }) => {
      const l = layout(db, i.layout_id);
      if (l.is_system) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'system_template', fields: { layout_id: 'system_template' } });
      db.profileLayout.layouts = db.profileLayout.layouts.filter((x) => x.id !== i.layout_id);
      const fallback = db.profileLayout.layouts.find((x) => x.id === 'pl_default')?.id ?? db.profileLayout.layouts[0]!.id;
      for (const role of Object.keys(db.profileLayout.roleAssignments) as (keyof typeof db.profileLayout.roleAssignments)[]) {
        if (db.profileLayout.roleAssignments[role] === i.layout_id) db.profileLayout.roleAssignments[role] = fallback;
      }
      return { ok: true };
    },
  },
  'profile_layout.assign_role': {
    execute: (db, i: { role: SystemRoleKey; layout_id: string }) => {
      layout(db, i.layout_id);
      db.profileLayout.roleAssignments[i.role] = i.layout_id;
      return { role: i.role, layout_id: i.layout_id };
    },
  },
};
