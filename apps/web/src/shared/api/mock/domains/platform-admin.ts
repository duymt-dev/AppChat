// Mock Quản trị nền tảng /admin (TIP-040) — chỉ để chạy màn ở chế độ mock / E2E mock; nguồn sự thật là server (ngữ cảnh nền tảng, CAS,
// bí mật chỉ ghi). Dữ liệu mẫu nhỏ, cùng hình dạng hợp đồng `@appchat/shared` (platform-admin). Người dùng mock luôn là admin nền tảng.
import { ApiRequestError } from '@appchat/shared';
import type { AdminPlanDto, AdminPriceDto, AdminProviderDto, AdminRouteGroupDto, AdminTemplateDto, AdminWorkspaceDto } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';

const AT = '2026-06-20T03:00:00.000Z';

export interface PlatformAdminState {
  workspaces: AdminWorkspaceDto[];
  plans: AdminPlanDto[];
  providers: AdminProviderDto[];
  routes: AdminRouteGroupDto[];
  prices: AdminPriceDto[];
  templates: AdminTemplateDto[];
}

export const createPlatformAdminState = (): PlatformAdminState => ({
  workspaces: [
    {
      id: '0190f000-0000-7000-8000-00000000a001',
      name: 'Spa Hoa Mai',
      slug: 'spa-hoa-mai',
      status: 'active',
      db_status: 'active',
      version: 0,
      suspended_at: null,
      suspend_reason: null,
      owner: { name: 'Minh Anh', email: 'owner@hoamai.vn' },
      subscription: { plan_key: 'team', plan_name: 'Team', status: 'active', ends_at: '2026-07-20T03:00:00.000Z' },
      stats: null,
      refreshed_at: null,
      created_at: AT,
    },
  ],
  plans: [
    { key: 'team', version: 1, segment: 'business', name: 'Team', price_month: '990000', price_year: null, credits_month: 3000, max_users: 5, max_channels: 3, max_agents: 3, desc: '', popular: true, features: ['5 người dùng'], active: true, sort: 4, is_trial_plan: false },
  ],
  providers: [
    { key: 'router', version: 1, kind: 'openai_compatible', name: '9router', base_url: 'https://llm.example.com/v1', has_api_key: true, header_names: [], capabilities: { tools: true }, status: 'active', last_probe_at: null, last_error: null },
  ],
  routes: (['standard', 'advanced', 'max'] as const).flatMap((tier) => (['chat', 'embed', 'rerank'] as const).map((purpose) => ({ tier, purpose, version: 0, routes: purpose === 'chat' ? [{ provider_key: 'router', model: 'gpt-4.1-mini' }] : [] }))),
  prices: [{ provider_key: 'router', model: 'gpt-4.1-mini', version: 1, tier: 'standard', credits_per_1k_in: '0.4', credits_per_1k_out: '1.6', active: true, updated_at: AT }],
  templates: [],
});

const page = <T,>(data: T[]) => ({ data, next_cursor: null });
const stale = (cur: number, v: number | undefined) => {
  if (v !== cur) throw new ApiRequestError(409, { code: 'CONFLICT', message: 'stale', fields: { if_version: 'stale', version: String(cur) } });
};

export const platformAdminRoutes: Record<string, MockRoute> = {
  '/admin/session': () => ({ user_id: 'u_admin', name: 'Admin', email: 'admin@appchat.local', locale: 'vi', platform_admin: true }),
  '/admin/workspaces': (db, p) => page(db.platformAdmin.workspaces.filter((w) => !p.status || w.status === p.status)),
  '/admin/config/plans': (db) => db.platformAdmin.plans,
  '/admin/config/providers': (db) => db.platformAdmin.providers,
  '/admin/config/routes': (db) => db.platformAdmin.routes,
  '/admin/config/prices': (db) => db.platformAdmin.prices,
  '/admin/config/templates': (db) => db.platformAdmin.templates,
  '/admin/transfers': () => page([]),
  '/admin/bank-transactions': () => page([]),
  '/admin/sales-inquiries': () => page([]),
};

export const platformAdminHandlers: Record<string, MockHandler> = {
  'admin.workspace.suspend': {
    execute: (db, i: { workspace_id: string; if_version: number; reason: string }) => {
      const w = db.platformAdmin.workspaces.find((x) => x.id === i.workspace_id)!;
      stale(w.version, i.if_version);
      Object.assign(w, { status: 'suspended', db_status: 'suspended', suspend_reason: i.reason, suspended_at: AT, version: w.version + 1 });
      return { workspace_id: w.id, status: 'suspended', version: w.version };
    },
  },
  'admin.workspace.resume': {
    execute: (db, i: { workspace_id: string; if_version: number }) => {
      const w = db.platformAdmin.workspaces.find((x) => x.id === i.workspace_id)!;
      stale(w.version, i.if_version);
      Object.assign(w, { status: 'active', db_status: 'active', suspend_reason: null, suspended_at: null, version: w.version + 1 });
      return { workspace_id: w.id, status: 'active', version: w.version };
    },
  },
  'admin.plan.upsert': {
    execute: (db, i: AdminPlanDto & { if_version?: number }) => {
      const cur = db.platformAdmin.plans.find((p) => p.key === i.key);
      if (cur) stale(cur.version, i.if_version);
      const rest = { ...i };
      delete rest.if_version;
      const next = { ...rest, version: (cur?.version ?? 0) + 1, is_trial_plan: cur?.is_trial_plan ?? false };
      db.platformAdmin.plans = cur ? db.platformAdmin.plans.map((p) => (p.key === i.key ? next : p)) : [...db.platformAdmin.plans, next];
      return { key: i.key, version: next.version, created: !cur };
    },
  },
  'admin.llm_provider.disable': {
    execute: (db, i: { key: string; if_version: number; status: 'active' | 'disabled' }) => {
      const p = db.platformAdmin.providers.find((x) => x.key === i.key)!;
      stale(p.version, i.if_version);
      Object.assign(p, { status: i.status, version: p.version + 1 });
      return { key: p.key, version: p.version, status: p.status };
    },
  },
};
