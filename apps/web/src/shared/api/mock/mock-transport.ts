// Mock transport: đúng envelope Blueprint §4.1 + mock ActionExecutor áp policy nguồn `ui` (Blueprint §3.3).
import { getAction } from '@appchat/actions';
import { ApiRequestError, can, ROLE_DEFS, type PermissionKey } from '@appchat/shared';
import type { Transport } from '../transport';
import { mockHandlers } from './handlers';
import { mockRoutes } from './routes';
import { mockPosts, taxLookup } from './auth-routes';
import { mockDb, mutate } from './store';

const fail = (status: number, code: ConstructorParameters<typeof ApiRequestError>[1]['code'], message: string) => {
  throw new ApiRequestError(status, { code, message });
};

let seq = 0;
const nextId = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

const confirmTokens = new Map<string, string>();
const undoLog = new Map<string, () => void>();

const authzCtx = () => {
  const { role } = mockDb();
  const def = ROLE_DEFS[role];
  return { userId: 'u_tram', isOwner: role === 'owner', permissions: new Set(def.permissions), scope: def.scope, teamIds: [] };
};

export const mockTransport: Transport = {
  async get(path, params) {
    const tax = path.match(/^\/business-lookup\/tax\/(.+)$/);
    if (tax) return structuredClone(taxLookup(mockDb(), decodeURIComponent(tax[1]!))) as never;
    const route = mockRoutes[path];
    if (!route) fail(404, 'NOT_FOUND', `mock route ${path}`);
    return structuredClone(route!(mockDb(), params ?? {})) as never;
  },

  async post(path, body) {
    const handler = mockPosts[path];
    if (!handler) return fail(404, 'NOT_FOUND', `mock post ${path}`);
    let out: unknown;
    mutate((db) => {
      out = handler(db, (body ?? {}) as Record<string, unknown>);
    }, `post.${path}`);
    return structuredClone(out) as never;
  },

  async action(id, input, opts) {
    const def = getAction(id);
    const handler = mockHandlers[id];
    if (!def || !handler) return fail(404, 'ACTION_NOT_FOUND', id);
    const parsed = def.input.safeParse(input);
    if (!parsed.success) return fail(422, 'VALIDATION_FAILED', parsed.error.message);
    if (def.permission !== 'self' && def.permission !== 'platform_admin' && !can(authzCtx(), def.permission as PermissionKey)) {
      return fail(403, 'FORBIDDEN', id);
    }

    const inputHash = JSON.stringify(parsed.data);
    if (def.bulk && !(opts?.confirmToken && confirmTokens.get(opts.confirmToken) === inputHash)) {
      const token = nextId('ct');
      confirmTokens.set(token, inputHash);
      const p = handler.preview?.(mockDb(), parsed.data as never) ?? { summary: id };
      return {
        status: 202,
        data: {
          status: 'preview_required',
          preview: { ...p, risk: def.risk },
          confirm_token: token,
          expires_at: new Date(Date.now() + 600_000).toISOString(),
        },
      };
    }

    let result: unknown;
    mutate((db) => {
      result = handler.execute(db, parsed.data as never);
    }, `action.${id}`);
    const logId = nextId('al');
    const undoUntil = def.undo ? new Date(Date.now() + def.undo.windowSec * 1000).toISOString() : undefined;
    if (def.undo && handler.undo) undoLog.set(logId, () => mutate((db) => handler.undo!(db, parsed.data as never)));
    return {
      status: 200,
      data: {
        result: result as never,
        action_log_id: logId,
        ...(undoUntil ? { undo_until: undoUntil } : {}),
        ...(def.uiTarget ? { ui_target: def.uiTarget(result as never) } : {}),
      },
    };
  },

  async undo(actionLogId) {
    const fn = undoLog.get(actionLogId);
    if (!fn) fail(409, 'CONFLICT', 'UNDO_EXPIRED');
    fn!();
    undoLog.delete(actionLogId);
  },
};
