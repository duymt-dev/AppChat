// Transport thật (Blueprint §4.1, §4.3, §8 Auth flow) — bật khi backend của module xong. Component không đổi.
// Access token chỉ giữ trong bộ nhớ; refresh token là cookie httpOnly (path /api/v1/auth). 401 → POST /auth/refresh một lần
// rồi gọi lại. `X-Workspace-Id` = workspace đang dùng (GET /session → workspace_id; đổi bằng workspace.switch).
import { ApiRequestError, type ErrorEnvelope } from '@appchat/shared';
import type { Transport } from './transport';

const BASE = '/api/v1';
/** Lệnh trả access token mới (đăng nhập / xác thực / làm mới). */
const ISSUES_TOKEN = new Set(['/auth/otp/verify', '/auth/password/login', '/auth/refresh']);

let workspaceId: string | null = null;
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

/** Người nghe đổi phiên (token mới / workspace mới / đăng xuất) — socket realtime kết nối lại với thông tin mới. */
const listeners = new Set<() => void>();
const changed = () => {
  for (const fn of listeners) fn();
};
export const onSessionChange = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
/** Thông tin xác thực cho handshake Socket.IO `/ws` (Blueprint §4.6) — cùng token / workspace của request HTTP. */
export const sessionAuth = () => ({ token: accessToken, workspace_id: workspaceId });

export const setWorkspaceHeader = (id: string | null) => {
  if (id === workspaceId) return;
  workspaceId = id;
  changed();
};

const headers = (extra: Record<string, string> = {}, json = true): Record<string, string> => ({
  ...(json ? { 'content-type': 'application/json' } : {}),
  ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  ...(workspaceId ? { 'x-workspace-id': workspaceId } : {}),
  ...extra,
});

/** Một lần làm mới dùng chung cho mọi request đang chờ (cookie refresh xoay vòng — gọi song song sẽ bị coi là dùng lại). */
const refresh = (): Promise<boolean> => {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      if (!res.ok) {
        accessToken = null;
        return false;
      }
      accessToken = ((await res.json()) as { data: { access_token: string } }).data.access_token;
      changed();
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
};

/** Gửi kèm access token; chưa có token hoặc gặp 401 → làm mới một lần rồi gửi lại (trừ chính các lệnh auth). */
const send = async (path: string, init: RequestInit & { extra?: Record<string, string> } = {}): Promise<Response> => {
  // FormData: để trình duyệt tự đặt content-type multipart (kèm boundary).
  const go = () => fetch(`${BASE}${path}`, { ...init, credentials: 'include', headers: headers(init.extra, !(init.body instanceof FormData)) });
  const isAuth = path.startsWith('/auth/');
  if (!accessToken && !isAuth) await refresh();
  const res = await go();
  if (res.status !== 401 || isAuth) return res;
  return (await refresh()) ? go() : res;
};

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
    const body = await parse<{ data: unknown; next_cursor?: string | null }>(await send(`${path}${qs.size ? `?${qs}` : ''}`));
    // Phiên mang workspace đang dùng → mọi request sau gắn X-Workspace-Id.
    if (path === '/session') setWorkspaceHeader((body.data as { workspace_id?: string | null }).workspace_id ?? null);
    return ('next_cursor' in body ? body : body.data) as never;
  },
  async post(path, body) {
    const res = await send(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
    const parsed = await parse<{ data?: unknown } | undefined>(res);
    const data = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed;
    if (ISSUES_TOKEN.has(path)) {
      accessToken = (data as { access_token?: string }).access_token ?? null;
      changed();
    }
    if (path === '/auth/logout') {
      accessToken = null;
      workspaceId = null;
      changed();
    }
    return data as never;
  },
  async action(id, input, opts) {
    const res = await send(`/actions/${id}`, {
      method: 'POST',
      extra: {
        'x-action-source': 'ui',
        ...(opts?.idempotencyKey ? { 'idempotency-key': opts.idempotencyKey } : {}),
      },
      body: JSON.stringify({ input, confirm_token: opts?.confirmToken }),
    });
    const body = await parse<{ data: never }>(res);
    if (id === 'workspace.switch' && res.status === 200) setWorkspaceHeader((body.data as { result: { workspace_id: string } }).result.workspace_id);
    return { status: res.status === 202 ? 202 : 200, data: body.data } as never;
  },
  async undo(actionLogId) {
    await parse(await send(`/action-logs/${actionLogId}/undo`, { method: 'POST' }));
  },
  async upload(file, purpose) {
    const form = new FormData();
    form.set('purpose', purpose);
    form.set('file', file, file.name);
    return (await parse<{ data: never }>(await send('/files', { method: 'POST', body: form }))).data;
  },
  async blob(path) {
    const res = await send(path, { extra: { accept: '*/*' } });
    if (!res.ok) await parse(res);
    return res.blob();
  },
};
