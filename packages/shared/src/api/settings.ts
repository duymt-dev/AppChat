// Shape đọc Cài đặt (FE ↔ BE — gap-filling §5, TIP-013): workspace, thành viên, vai trò, giờ làm việc / SLA.
// Mock transport (apps/web) và API thật parse cùng các schema này.
import { z } from 'zod';
import { PERMISSIONS, SCOPE_MODULES, SYSTEM_ROLES } from '../authz';

const dataScope = z.enum(['own', 'team', 'all', 'none']);
const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

/** `GET /v1/settings/workspace` */
export const workspaceSettingsSchema = z.object({
  workspace: z.object({
    id: z.string(),
    name: z.string(),
    initial: z.string(),
    legal_name: z.string(),
    website: z.string(),
    tax_code: z.string(),
    address: z.string(),
    support_phone: z.string(),
    admin_email: z.string(),
    locale: z.enum(['vi', 'en']),
    timezone: z.string(),
    date_format: z.enum(['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY']),
    currency: z.literal('VND'),
  }),
  workspaces: z.array(z.object({ id: z.string(), name: z.string(), plan: z.string(), seats: z.string(), color: z.string(), current: z.boolean() })),
});
export type WorkspaceSettingsDto = z.infer<typeof workspaceSettingsSchema>;

/** `GET /v1/settings/members?q=` — thành viên active + lời mời còn chờ (`invite: true`). */
export const settingsMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  dept: z.string(),
  color: z.string(),
  /** `online` · thời điểm hoạt động cuối (ISO; mock: '2h' / '3d') · `never`. */
  last: z.string(),
  status: z.enum(['active', 'offline', 'pending']),
  invite: z.boolean(),
});
export const membersPageSchema = z.object({
  data: z.array(settingsMemberSchema),
  total: z.number().int(),
  /** null = gói không giới hạn người dùng. */
  seat_limit: z.number().int().nullable(),
  next_cursor: z.null(),
});
export type MembersPageDto = z.infer<typeof membersPageSchema>;

/** `GET /v1/settings/roles` — 5 vai trò hệ thống, ma trận chỉ đọc (D27). */
export const settingsRolesSchema = z.object({
  roles: z.array(
    z.object({
      key: z.enum(SYSTEM_ROLES),
      color: z.string(),
      count: z.number().int(),
      permissions: z.array(z.enum(PERMISSIONS)),
      scope: z.record(z.enum(SCOPE_MODULES), dataScope),
    }),
  ),
  permissions: z.array(z.enum(PERMISSIONS)),
});

/** `GET /v1/settings/sla` — chính sách mặc định + giờ làm việc + leo thang + dự báo rủi ro. */
export const slaSettingsSchema = z.object({
  policy: z.object({
    name: z.string(),
    scope: z.string(),
    tier: z.string(),
    color: z.string(),
    on: z.boolean(),
    frt_ai: z.number().int(),
    frt_human: z.number().int(),
    ttr_ai: z.number().int(),
    ttr_human: z.number().int(),
  }),
  tz: z.string(),
  days: z.array(z.object({ day: z.number().int().min(0).max(6), on: z.boolean(), from: hhmm, to: hhmm })).length(7),
  pause_sla: z.boolean(),
  escalation: z.array(z.object({ key: z.string(), color: z.string(), on: z.boolean() })),
  risk: z.object({ at_risk: z.number().int(), ai: z.number().int(), human: z.number().int() }),
});
export type SlaSettingsDto = z.infer<typeof slaSettingsSchema>;
