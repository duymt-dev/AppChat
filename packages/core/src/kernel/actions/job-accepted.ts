// 202 `job_accepted` (TIP-032b — nền dùng chung, 045b mở rộng cho bulk / export): handler ghi bản ghi việc + outbox trong transaction
// của executor rồi trả `accepted` qua `jobAccepted`; executor dựng phản hồi 202 bằng `acceptedResponse` và lưu vào idempotency với mã
// 202 — gửi lại cùng khoá trả đúng handle (không xếp việc lần hai). Không có executor thứ hai: mọi kiểm quyền / policy / log như 200.
import type { ActionAccepted } from '@appchat/actions';
import type { HandlerOutcome } from './handler';

export type JobAccepted = Extract<ActionAccepted, { status: 'job_accepted' }>;

/** Gắn vào HandlerOutcome khi việc chạy nền (bản ghi việc đã ghi trong cùng transaction). */
export const jobAccepted = (jobId: string, statusUrl: string): Pick<HandlerOutcome<unknown>, 'accepted'> => ({ accepted: { jobId, statusUrl } });

export const acceptedResponse = (logId: string, a: { jobId: string; statusUrl: string }): JobAccepted => ({ status: 'job_accepted', job_id: a.jobId, action_log_id: logId, status_url: a.statusUrl });

/** Bản ghi idempotency mã 202 → phản hồi `job_accepted` đã lưu; mã khác → null. */
export const replayAccepted = (statusCode: number | null, response: unknown): JobAccepted | null =>
  statusCode === 202 && (response as { status?: string } | null)?.status === 'job_accepted' ? (response as JobAccepted) : null;
