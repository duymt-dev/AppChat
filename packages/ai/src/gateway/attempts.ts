// Kết quả một lần gọi model thật (TIP-019b §2.6). Phân loại lỗi: nhà cung cấp TRẢ LỜI từ chối rõ ràng (HTTP 408 / 429 / 5xx, 4xx) hoặc
// chưa từng kết nối (ECONNREFUSED / ENOTFOUND) = `rejected` — không usage, được chuyển ứng viên kế (trừ 4xx); hết giờ / đứt giữa
// chừng / đã phát chữ / huỷ khi đang chạy = `unknown` — có thể đã chạy, KHÔNG gửi lại mù, không chuyển ứng viên.
export type AttemptOutcome =
  | { kind: 'usage'; tokensIn: number; tokensOut: number; latencyMs: number }
  | { kind: 'rejected'; error: string; latencyMs: number }
  | { kind: 'unknown'; error: string; latencyMs: number };

export interface AttemptInfo {
  stepIdx: number;
  /** Thứ tự ứng viên trong bước (0 = route đầu). */
  candidate: number;
  provider: string;
  model: string;
}

const NEVER_SENT = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);

/** `fallback` = được thử ứng viên kế (chỉ khi `rejected`). */
export function classifyAttemptError(err: unknown, emitted: boolean, aborted: boolean): { kind: 'rejected' | 'unknown'; fallback: boolean; error: string } {
  const e = (err ?? {}) as { statusCode?: number; code?: string; name?: string; cause?: unknown; message?: string };
  const error = String(e.code ?? (typeof e.statusCode === 'number' ? `HTTP_${e.statusCode}` : e.name ?? 'error')).slice(0, 60);
  if (aborted) return { kind: 'unknown', fallback: false, error: 'cancelled' };
  if (emitted) return { kind: 'unknown', fallback: false, error };
  if (typeof e.statusCode === 'number') return { kind: 'rejected', fallback: e.statusCode >= 500 || e.statusCode === 429 || e.statusCode === 408, error };
  if (e.code && NEVER_SENT.has(e.code)) return { kind: 'rejected', fallback: true, error };
  const cause = e.cause as { code?: string; statusCode?: number } | undefined;
  if (cause && (typeof cause.statusCode === 'number' || (cause.code && NEVER_SENT.has(cause.code)))) return classifyAttemptError(cause, false, false);
  return { kind: 'unknown', fallback: false, error };
}
