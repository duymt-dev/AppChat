// Transport chung cho mọi màn (GOAL-FE-PROTOTYPE §Kiến trúc mock). Đổi mock ↔ http bằng NEXT_PUBLIC_API_MODE.
import type { ActionAccepted, ActionResult } from '@appchat/actions';

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface ActionCallOptions {
  confirmToken?: string;
  idempotencyKey?: string;
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
}

export type ApiMode = 'mock' | 'http';

export const apiMode = (): ApiMode => (process.env.NEXT_PUBLIC_API_MODE === 'http' ? 'http' : 'mock');
