// Transport chung cho mọi màn (GOAL-FE-PROTOTYPE §Kiến trúc mock). Đổi mock ↔ http bằng NEXT_PUBLIC_API_MODE.
import type { ActionAccepted, ActionResult } from '@appchat/actions';
import type { StreamFrame } from '@appchat/shared';
import type { StreamOutcome } from './sse-client';

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface ActionCallOptions {
  confirmToken?: string;
  idempotencyKey?: string;
  /** Handle server ký cho node action của cây GenUI (TIP-023c) → header `x-genui-intent`; server tự đặt nguồn assistant + xác nhận. */
  genuiIntent?: string;
  /** Xác nhận form GenUI có ô bí mật: handle vault server trả ở 202 — thay cho giá trị bí mật (không gửi lại). */
  secretVault?: string;
}

export type ActionResponse<O = unknown> =
  | { status: 200; data: ActionResult<O> }
  | { status: 202; data: ActionAccepted };

export interface Transport {
  /** GET /v1/<path> → payload của envelope `{ data }` hoặc `{ data, next_cursor }`. */
  get<T>(path: string, params?: QueryParams): Promise<T>;
  /** POST endpoint ngoài Action Registry — chỉ auth / public (Blueprint §4.2: /auth/*, /workspaces, /public/*). */
  post<T>(path: string, body?: unknown): Promise<T>;
  /** POST /v1/actions/:id */
  action<O = unknown>(id: string, input: unknown, opts?: ActionCallOptions): Promise<ActionResponse<O>>;
  /** POST /v1/action-logs/:id/undo */
  undo(actionLogId: string): Promise<void>;
  /** POST /v1/files (multipart ≤ 25MB) → `file_id` dùng ở action sau (vd. `kb.add_source`). Mock: id giả, không giữ nội dung. */
  upload(file: File, purpose: string): Promise<UploadedFile>;
  /** GET /v1/<path> trả tệp nhị phân (PDF xem trước — TIP-028). Mock: tệp nhỏ dựng tại chỗ. */
  blob(path: string): Promise<Blob>;
  /**
   * Luồng SSE (TIP-023c, `Accept: text/event-stream`): POST khi có `body` (lượt Trợ lý), GET khi không (nối lại theo cursor). Frame theo
   * thứ tự seq → `onFrame`. Mock: phát lại sự kiện của lượt kịch bản thành frame (không có server).
   */
  stream(path: string, body: unknown, onFrame: (f: StreamFrame) => void, signal?: AbortSignal): Promise<StreamOutcome>;
}

export interface UploadedFile {
  file_id: string;
  name: string;
  size: number;
}

export type ApiMode = 'mock' | 'http';

export const apiMode = (): ApiMode => (process.env.NEXT_PUBLIC_API_MODE === 'http' ? 'http' : 'mock');
