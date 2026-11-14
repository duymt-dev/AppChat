// Shape `GET /v1/dashboard` (Blueprint §4.4 dashboard, §7.2 — TIP-038 pha 2): một lần đọc cho màn Tổng quan, cùng schema mock + API thật.
// Số liệu theo quyền + data scope người xem (không aggregate trên dữ liệu ngoài scope rồi che ở UI). Khối không đủ quyền → `null` / mảng
// rỗng (không payload ẩn). Khối catalog tĩnh (`modules`, `cdp`, `news`) là danh mục có nhãn, không phải chỉ số kinh doanh.
import { z } from 'zod';

/** Việc follow khách (bảng `follow_up`, DC-241): id bản ghi thật, khách + giai đoạn + kênh + hạn. */
export const followUpItemSchema = z.object({
  id: z.string(),
  contact_id: z.string(),
  name: z.string(),
  initial: z.string(),
  avatar: z.string(),
  channel: z.string(),
  channel_bg: z.string(),
  stage: z.string(),
  stage_color: z.string(),
  service: z.string(),
  due: z.string(),
  due_at: z.string(),
  overdue: z.boolean(),
  version: z.number().int(),
  route: z.string(),
});
export type FollowUpItemDto = z.infer<typeof followUpItemSchema>;

/** "Việc cần tôi": id + loại + hạn + màn mở — không chỉ là chữ. */
export const WORK_ITEM_TYPES = ['approval', 'handoff', 'ticket_overdue', 'appointment_overdue', 'contract_renewal'] as const;
export const workItemSchema = z.object({
  id: z.string(),
  type: z.enum(WORK_ITEM_TYPES),
  title: z.string(),
  sub: z.string(),
  due_at: z.string().nullable(),
  route: z.string(),
  /** Gia hạn hợp đồng: câu gợi ý mở Trợ lý soạn đề xuất (không tự gửi / tự gia hạn). */
  ask: z.string().optional(),
});
export type WorkItemDto = z.infer<typeof workItemSchema>;

export const dashboardSchema = z.object({
  stats: z.array(z.object({ label: z.string(), value: z.string(), tone: z.enum(['up', 'warn', 'muted']), note: z.string(), icon: z.string() })),
  connect_groups: z.array(z.object({ key: z.enum(['in', 'out', 'erp', 'data']), items: z.array(z.object({ name: z.string(), meta: z.string(), warn: z.boolean() })) })),
  agents: z.array(z.object({ icon: z.string(), name: z.string(), status: z.string(), desc: z.string(), sessions: z.string(), auto: z.string() })),
  modules: z.array(z.string()),
  cdp: z.array(z.string()),
  onboarding: z.object({
    steps: z.array(z.object({ key: z.enum(['channel', 'ai', 'team', 'template', 'sla']), icon: z.string(), title: z.string(), desc: z.string(), cta: z.string(), done: z.boolean() })),
    done_count: z.number().int(),
  }),
  follow_ups: z.array(followUpItemSchema).max(5),
  /** Số việc follow còn mở người xem thấy (không phải tổng tenant). */
  follow_up_count: z.number().int(),
  my_work: z.array(workItemSchema).max(20),
  /** AI hôm nay (ngày theo giờ workspace) — chỉ run / action thật, không dry-run. */
  ai_today: z.object({ runs: z.number().int(), actions: z.number().int(), handoffs: z.number().int(), credits: z.number().int().nullable() }),
  /** Ví Credit — chỉ người có `billing.manage` (Owner); người khác `null`. */
  credit: z.object({ balance: z.number().int(), days_estimate: z.number().int(), low: z.boolean() }).nullable(),
  news: z.array(z.object({ tag: z.string(), date: z.string(), title: z.string(), desc: z.string(), color: z.string() })),
  notifications: z.array(z.object({ icon: z.string(), color: z.string(), text: z.string(), time: z.string(), unread: z.boolean() })),
});
export type DashboardDto = z.infer<typeof dashboardSchema>;
