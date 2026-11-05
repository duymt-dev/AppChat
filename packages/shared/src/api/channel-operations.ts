// Trạng thái lệnh thao tác kênh trên tin (TIP-014b A): GET /v1/inbox/channel-operations/:id — chỉ lệnh thu hồi / cảm xúc gắn hội thoại,
// người ra lệnh hoặc người còn thấy hội thoại. `pending` = đang chờ nhà cung cấp; `unknown` = đã gửi lệnh nhưng chưa biết kết quả (không tự
// thử lại); `partial` = tin nhiều phần, một số phần xong. Không chứa id phía kênh.
import { z } from 'zod';

export const CHANNEL_OPERATION_STATES = ['pending', 'confirmed', 'failed', 'unknown', 'partial', 'cancelled', 'superseded'] as const;
export type ChannelOperationState = (typeof CHANNEL_OPERATION_STATES)[number];

export const channelOperationSchema = z.object({
  id: z.string(),
  kind: z.enum(['recall', 'react']),
  conversation_id: z.string(),
  message_id: z.string(),
  state: z.enum(CHANNEL_OPERATION_STATES),
  /** Cảm xúc mong muốn (react) — null = gỡ. */
  emoji: z.string().nullable().optional(),
  error: z.string().nullable(),
  parts: z.array(z.object({ part_no: z.number().int(), status: z.enum(['confirmed', 'failed', 'unknown']) })).optional(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type ChannelOperationDto = z.infer<typeof channelOperationSchema>;

/**
 * Lần lấy lịch sử kênh (TIP-014b C): GET /v1/settings/channels/:id/syncs/:runId (quyền channels.manage). `complete` = đã phủ khoảng yêu cầu;
 * `provider_limit` = nhà cung cấp hết dữ liệu trước mốc (không đủ N ngày); `partial` = dừng ở trần / bị ngắt; `timeout` = trang không về.
 * `earliest_at` / `latest_at` = khoảng THỰC thấy, không phải khoảng yêu cầu.
 */
export const channelHistoryRunSchema = z.object({
  id: z.string(),
  channel_account_id: z.string(),
  days: z.number().int(),
  cutoff_at: z.string(),
  state: z.enum(['queued', 'running', 'complete', 'provider_limit', 'partial', 'timeout', 'failed', 'superseded']),
  received: z.number().int(),
  in_range: z.number().int(),
  imported: z.number().int(),
  pages: z.number().int(),
  earliest_at: z.string().nullable(),
  latest_at: z.string().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  finished_at: z.string().nullable(),
});
export type ChannelHistoryRunDto = z.infer<typeof channelHistoryRunSchema>;
