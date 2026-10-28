// Transport thật (Blueprint §4.1, §4.3) — bật khi backend của module xong. Component không đổi.
import { ApiRequestError, type ErrorEnvelope } from '@appchat/shared';
import type { Transport } from './transport';

const BASE = '/api/v1';

let workspaceId: string | null = null;
export const setWorkspaceHeader = (id: string | null) => {
  workspaceId = id;
};

const headers = (extra: Record<string, string> = {}): Record<string, string> => ({
  'content-type': 'application/json',
  ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
  ...extra,
});

const parse = async <T>(res: Response): Promise<T> => {
  if (res.status === 204) return undefined as T;
  const body = (await res.json()) as T | ErrorEnvelope;
  if (!res.ok && typeof body === 'object' && body !== null && 'error' in body) {
    throw new ApiRequestError(res.status, (body as ErrorEnvelope).error);
  }
  return body as T;
};

export const httpTransport: Transport = {
  async get(path, params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null) qs.set(k, String(v));
    const res = await fetch(`${BASE}${path}${qs.size ? `?${qs}` : ''}`, { headers: headers(), credentials: 'include' });
    const body = await parse<{ data: unknown; next_cursor?: string | null }>(res);
    return ('next_cursor' in body ? body : body.data) as never;
  },
  async action(id, input, opts) {
    const res = await fetch(`${BASE}/actions/${id}`, {
      method: 'POST',
      credentials: 'include',
      headers: headers({
        'x-action-source': 'ui',
        ...(opts?.idempotencyKey ? { 'idempotency-key': opts.idempotencyKey } : {}),
      }),
      body: JSON.stringify({ input, confirm_token: opts?.confirmToken }),
    });
    const body = await parse<{ data: never }>(res);
    return { status: res.status === 202 ? 202 : 200, data: body.data } as never;
  },
  async undo(actionLogId) {
    await parse(await fetch(`${BASE}/action-logs/${actionLogId}/undo`, { method: 'POST', headers: headers(), credentials: 'include' }));
  },
};
