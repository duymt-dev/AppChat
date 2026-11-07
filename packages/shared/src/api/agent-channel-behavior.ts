// Hành vi agent trực kênh (TIP-022b) — DTO dùng chung FE ↔ BE ↔ action: lịch tuần, phân luồng từ khoá theo tài khoản, lời chào tự động,
// ý định (bộ từ vựng đóng) và tóm tắt bàn giao có cấu trúc. Validate lịch ở `ai/weekly-schedule` (không thư viện ngày mới).
import { z } from 'zod';
import { MAX_INTERVALS_PER_DAY, SCHEDULE_DAYS, validateSchedule } from '../ai/weekly-schedule';

const interval = z.object({ from: z.string().max(5), to: z.string().max(5) });

export const weeklyScheduleSchema = z
  .object({ timezone: z.string().min(1).max(64), days: z.array(z.array(interval).max(MAX_INTERVALS_PER_DAY)).length(SCHEDULE_DAYS) })
  .superRefine((s, ctx) => {
    for (const [path, code] of Object.entries(validateSchedule(s))) ctx.addIssue({ code: 'custom', message: code, path: path.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)) });
  });
export type WeeklyScheduleDto = z.infer<typeof weeklyScheduleSchema>;

/** Trạng thái lịch của agent: `needs_configuration` = chế độ `custom` cũ chưa có lịch có cấu trúc (giữ hành vi cũ, cảnh báo, chặn xuất bản mới). */
export const SCHEDULE_STATES = ['ok', 'needs_configuration'] as const;

export const ROUTING_MAX_CANDIDATES = 25;
export const ROUTING_MAX_KEYWORDS = 20;
export const ROUTING_KEYWORD_MAX = 40;

export const routingCandidateSchema = z.object({
  agent_id: z.string().min(1),
  priority: z.number().int().min(0).max(100),
  keywords: z.array(z.string().trim().min(1).max(ROUTING_KEYWORD_MAX)).max(ROUTING_MAX_KEYWORDS),
});
export type RoutingCandidateDto = z.infer<typeof routingCandidateSchema>;

/** Phân luồng theo từ khoá của tài khoản kênh — opt-in; tắt = hành vi cũ (`agent_id` mặc định của tài khoản). */
export const channelRoutingSchema = z.object({
  enabled: z.boolean(),
  candidates: z.array(routingCandidateSchema).max(ROUTING_MAX_CANDIDATES),
});
export type ChannelRoutingDto = z.infer<typeof channelRoutingSchema>;

/** Cấu hình hành vi agent của một tài khoản kênh (đọc ở drawer Quản lý kênh). */
export const channelAgentBehaviorSchema = z.object({
  schedule: weeklyScheduleSchema.nullable(),
  routing: channelRoutingSchema,
  /** Lời chào tự động — mặc định tắt cho cấu hình cũ (không tự bật hành vi mới). */
  greeting_enabled: z.boolean(),
});
export type ChannelAgentBehaviorDto = z.infer<typeof channelAgentBehaviorSchema>;

export const AGENT_INTENTS_CLOSED = ['buy', 'question', 'complaint', 'booking', 'other'] as const;
export type AgentIntent = (typeof AGENT_INTENTS_CLOSED)[number];

export const HANDOFF_SUMMARY_REASONS = ['needs_human', 'low_confidence', 'complaint', 'credit', 'error', 'no_target', 'transfer_loop', 'approval_rejected', 'approval_expired', 'repeat', 'negative', 'banned', 'out_of_hours'] as const;

/** Tóm tắt bàn giao có cấu trúc (không phải nháp gửi khách) — chiếu theo quyền người xem khi mở. */
export const handoffSummarySchema = z.object({
  version: z.number().int(),
  reason: z.string().max(40),
  request: z.string().max(500),
  facts: z.array(z.object({ label: z.string().max(60), value: z.string().max(200), ref: z.object({ type: z.string(), id: z.string() }).optional() })).max(12),
  actions: z.array(z.object({ action_id: z.string(), status: z.enum(['ok', 'pending', 'denied', 'error']), detail: z.string().max(200) })).max(12),
  unresolved: z.string().max(300),
  last_message_id: z.string().nullable(),
  /** `model` = lấy từ run đã kiểm; `extractive` = dựng tất định khi model không có / hết credit. */
  source: z.enum(['model', 'extractive']),
  intent: z.enum(AGENT_INTENTS_CLOSED).nullable(),
  attachments_unreadable: z.number().int().min(0),
  created_at: z.string(),
});
export type HandoffSummaryDto = z.infer<typeof handoffSummarySchema>;

/** Cảnh báo gán tài khoản khi tạo / xuất bản agent: tài khoản đang có agent khác (từ cấu hình thật, không từ danh sách loại kênh). */
export const channelBindingPreviewSchema = z.object({
  accounts: z.array(z.object({ channel_account_id: z.string(), name: z.string(), type: z.string(), current_agent_id: z.string().nullable(), current_agent: z.string(), version: z.string() })),
});
export type ChannelBindingPreviewDto = z.infer<typeof channelBindingPreviewSchema>;
