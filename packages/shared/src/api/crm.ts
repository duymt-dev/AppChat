// Shape đọc domain crm (FE ↔ BE — gap-filling §5, TIP-015): GET /v1/contacts (D42), /contacts/stats, /contacts/duplicates,
// /contacts/:id (Hồ sơ 360°), /contacts/:id/collaborators, /contacts/:id/timeline, /contact-access-requests, /members,
// /settings/fields?entity=, /settings/profile-layouts. Mock transport (apps/web) và API thật parse cùng các schema này.
import { z } from 'zod';
import { activitySummarySchema } from './contact-activities';
import { contactInsightsSchema } from './contact-memory';
import { SYSTEM_ROLES } from '../authz/roles';
import { CUSTOM_FIELD_PLACES } from '../custom-fields/values';

const customValues = z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string()), z.null()]));
const stageKey = z.enum(['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost']);
const access = z.enum(['owner', 'collaborator', 'watcher', 'scope']);

export const contactRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  full_name: z.string(),
  first_name: z.string(),
  title: z.string(),
  initials: z.string(),
  avatar_hue: z.number().int(),
  reg_date: z.string(),
  reg_time: z.string(),
  type: z.enum(['individual', 'business', 'household']),
  group: z.enum(['vip', 'loyal', 'new', 'potential']),
  source: z.string(),
  source_label: z.string(),
  source_color: z.string(),
  email: z.string(),
  phone: z.string(),
  zalo: z.string(),
  city: z.string(),
  district: z.string(),
  status: z.enum(['active', 'potential', 'inactive']),
  stage: stageKey,
  owner_user_id: z.string(),
  owner_name: z.string(),
  owner_hue: z.number().int(),
  ai: z.object({ kind: z.enum(['ai', 'user', 'wait']), label: z.string(), hint: z.string() }),
  tags: z.array(z.string()),
  web_bg: z.number().int(),
  my_access: access,
  collaborator_count: z.number().int(),
  custom: customValues.optional(),
});
export type ContactRowDto = z.infer<typeof contactRowSchema>;

/** D42: `page` + `limit` → `meta`; không truyền `page` → trả hết (ô chọn, modal). */
export const contactsPageSchema = z.object({
  data: z.array(contactRowSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ total: z.number().int(), page: z.number().int(), limit: z.number().int() }),
});

export const crmStatsSchema = z.object({
  stats: z.array(z.object({ key: z.string(), value: z.string(), color: z.string(), icon: z.string() })),
  stages: z.array(z.object({ key: z.string(), color: z.string(), count: z.number().int() })),
  tag_defs: z.array(z.object({ id: z.string(), label: z.string(), line: z.string(), bg: z.string(), fg: z.string() })),
});

/** Sắp xếp danh sách / kanban (TIP-026): tương tác gần nhất (mặc định) · tên A→Z · mới tạo · tổng chi tiêu. */
export const CONTACT_SORTS = ['recent', 'name', 'created', 'value'] as const;
export type ContactSort = (typeof CONTACT_SORTS)[number];

/** `GET /contacts/board` — kanban theo giai đoạn: đếm theo bộ lọc + tối đa `limit` thẻ đầu mỗi cột (cột `lost` có khi có khách). */
export const contactsBoardSchema = z.object({
  columns: z.array(z.object({ key: stageKey, color: z.string(), total: z.number().int(), rows: z.array(contactRowSchema) })),
  limit: z.number().int(),
});

/** `GET /contacts/import-table?file_id=` — bảng đọc từ tệp CSV / XLSX đã tải lên (purpose `import`) để ghép cột ở client. */
export const importTableSchema = z.object({ columns: z.array(z.string()), rows: z.array(z.array(z.string())), total: z.number().int() });

const dupSide = z.object({ name: z.string(), email: z.string(), phone: z.string(), src: z.string() });
export const duplicatesSchema = z.object({
  summary: z.object({ groups: z.number().int(), records: z.number().int(), auto: z.number().int() }),
  groups: z.array(z.object({ id: z.string(), pct: z.number().int(), by: z.string(), a: dupSide, b: dupSide })),
});

export const membersListSchema = z.array(z.object({ id: z.string(), name: z.string(), role: z.string() }));

export const collaboratorsSchema = z.object({
  owner: z.object({ user_id: z.string(), name: z.string() }),
  collaborators: z.array(z.object({ user_id: z.string(), role: z.enum(['collaborator', 'watcher']), name: z.string() })),
});

export const accessRequestsSchema = z.array(
  z.object({
    id: z.string(),
    contact_id: z.string(),
    requester_user_id: z.string(),
    status: z.enum(['pending', 'approved', 'rejected']),
    note: z.string().optional(),
    requester_name: z.string(),
    contact_name: z.string().optional(),
  }),
);

const timelineItem = z.object({ icon: z.string(), tone: z.string(), when: z.string(), text: z.string() });
export const timelinePageSchema = z.object({ data: z.array(timelineItem.extend({ id: z.string(), at: z.string() })), next_cursor: z.string().nullable() });

const layoutTab = z.object({ key: z.string(), label: z.string(), enabled: z.boolean(), sort: z.number().int(), builtin: z.boolean(), blocks: z.array(z.string()) });

/** Hồ sơ 360° (`Contact360` của FE — features/inbox/types.ts). Phần thuộc domain khác rỗng / 0 tới TIP chủ. */
export const contact360Schema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  avatar_color: z.string(),
  /** Ảnh nhân viên đặt, hoặc ảnh đồng bộ từ kênh (TIP-014b D — link ký); vắng → chữ cái đầu. */
  avatar_url: z.string().optional(),
  tier: z.string(),
  since: z.string(),
  stage_label: z.string(),
  lead_score: z.number(),
  lead_level: z.string(),
  phone: z.string(),
  company: z.string(),
  email: z.string(),
  role: z.string(),
  points: z.string(),
  points_value: z.string(),
  journey: z.object({ stage: z.string(), hint: z.string() }),
  ai_summary: z.object({ badge: z.string(), close_pct: z.number(), bullets: z.array(z.string()) }),
  deal: z.object({ title: z.string(), value: z.string(), stage: z.string(), probability: z.number(), close_date: z.string(), need: z.string() }),
  history: z.array(timelineItem),
  tasks: z.array(z.object({ id: z.string(), title: z.string(), due: z.string(), done: z.boolean(), cal: z.boolean().optional() })),
  note: z.object({ body: z.string(), meta: z.string() }),
  comments: z.array(z.object({ author: z.string(), initial: z.string(), body: z.string(), at: z.string() })),
  crm: z.object({
    kpis: z.array(z.tuple([z.string(), z.string()])),
    open_deal: z.object({ title: z.string(), meta: z.string(), value: z.string() }),
    recent_order: z.object({ title: z.string(), status: z.string() }),
    recent_payment: z.object({ title: z.string(), status: z.string() }),
    segments: z.array(z.tuple([z.string(), z.string()])),
  }),
  ai: z.object({
    bars: z.array(z.tuple([z.string(), z.string(), z.number(), z.string()])),
    signals: z.array(z.tuple([z.string(), z.string()])),
    predict: z.object({ close: z.string(), revenue: z.string() }),
    churn: z.string(),
    nba: z.array(z.string()),
  }),
  timeline: z.array(timelineItem),
  files: z.array(z.object({ ext: z.string(), tone: z.string(), name: z.string(), meta: z.string() })),
  custom: customValues.optional(),
  /** Số liệu thật theo quyền người xem (TIP-015b) — công nợ, HĐ hiệu lực, đơn / thu gần nhất, LTV, liên kết chứng từ. */
  insights: contactInsightsSchema.optional(),
  /** Hoạt động CRM thật (TIP-026b): ghi chú / bình luận / việc chăm sóc / cơ hội — trang đầu theo quyền người xem. */
  activities: activitySummarySchema.optional(),
  /** Bố cục Hồ sơ 360° của vai trò người xem (Blueprint §4.4 ver2.1). */
  layout: z.object({ id: z.string(), name: z.string(), tabs: z.array(layoutTab) }).optional(),
});
export type Contact360Dto = z.infer<typeof contact360Schema>;

const fieldDef = z.object({
  key: z.string(),
  label: z.string(),
  type: z.string(),
  options: z.string(),
  required: z.boolean(),
  ai: z.boolean(),
  sys: z.boolean(),
  visible_in: z.record(z.enum(CUSTOM_FIELD_PLACES), z.boolean()),
  roles: z.array(z.string()),
  condition: z.string(),
});
export const fieldsDataSchema = z.object({ data: z.array(fieldDef), counts: z.record(z.string(), z.number().int()) });

const roleKey = z.enum(SYSTEM_ROLES);
export const profileLayoutsSchema = z.object({
  layouts: z.array(z.object({ id: z.string(), name: z.string(), is_system: z.boolean(), tabs: z.array(layoutTab), roles: z.array(roleKey), created_by: z.string() })),
  role_assignments: z.record(roleKey, z.string()),
});
