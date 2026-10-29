// Mock transport: đúng envelope Blueprint §4.1 + mock ActionExecutor áp policy nguồn `ui` (Blueprint §3.3).
import { getAction } from '@appchat/actions';
import { ApiRequestError, can, ROLE_DEFS, type PermissionKey } from '@appchat/shared';
import type { Transport } from '../transport';
import { mockHandlers } from './handlers';
import { mockRoutes } from './routes';
import { inboxParamRoute } from './domains/inbox';
import { customersParamRoute } from './domains/customers';
import { agentsParamRoute } from './domains/agents';
import { productsParamRoute } from './domains/products';
import { quotesParamRoute } from './domains/quotes';
import { contractsParamRoute } from './domains/contracts';
import { ordersParamRoute } from './domains/orders';
import { invoicesParamRoute } from './domains/invoices';
import { calendarParamRoute } from './domains/calendar';
import { ticketsParamRoute } from './domains/tickets';
import { marketingParamRoute } from './domains/marketing';
import { loyaltyParamRoute } from './domains/loyalty';
import { signParamPost, signParamRoute } from './domains/contracts-sign';
import { assistantPosts, markUndone, recordActionLog } from './domains/assistant';
import { mockPosts, taxLookup } from './auth-routes';
import { mockDb, mutate } from './store';

const fail = (
  status: number,
  code: ConstructorParameters<typeof ApiRequestError>[1]['code'],
  message: string,
) => {
  throw new ApiRequestError(status, { code, message });
};

let seq = 0;
const nextId = (p: string) => `${p}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

const confirmTokens = new Map<string, string>();
const undoLog = new Map<string, () => void>();

const authzCtx = () => {
  const { role } = mockDb();
  const def = ROLE_DEFS[role];
  return {
    userId: 'u_tram',
    isOwner: role === 'owner',
    permissions: new Set(def.permissions),
    scope: def.scope,
    teamIds: [],
  };
};

export const mockTransport: Transport = {
  async get(path, params) {
    const tax = path.match(/^\/business-lookup\/tax\/(.+)$/);
    if (tax) return structuredClone(taxLookup(mockDb(), decodeURIComponent(tax[1]!))) as never;
    const route =
      mockRoutes[path] ??
      productsParamRoute(path) ??
      quotesParamRoute(path) ??
      contractsParamRoute(path) ??
      ordersParamRoute(path) ??
      invoicesParamRoute(path) ??
      calendarParamRoute(path) ??
      ticketsParamRoute(path) ??
      marketingParamRoute(path) ??
      loyaltyParamRoute(path) ??
      signParamRoute(path) ??
      agentsParamRoute(path) ??
      customersParamRoute(path) ??
      inboxParamRoute(path);
    if (!route) fail(404, 'NOT_FOUND', `mock route ${path}`);
    return structuredClone(route!(mockDb(), params ?? {})) as never;
  },

  async post(path, body) {
    const handler = mockPosts[path] ?? assistantPosts[path] ?? signParamPost(path);
    if (!handler) return fail(404, 'NOT_FOUND', `mock post ${path}`);
    let out: unknown;
    const signEvent = path.match(/^\/public\/sign\/[^/]+\/(sign|decline)$/)?.[1];
    mutate(
      (db) => {
        out = handler(db, (body ?? {}) as Record<string, unknown>);
      },
      signEvent ? `contract.${signEvent === 'sign' ? 'signed' : 'declined'}` : `post.${path}`,
    );
    return structuredClone(out) as never;
  },

  async action(id, input, opts) {
    const def = getAction(id);
    const handler = mockHandlers[id];
    if (!def || !handler) return fail(404, 'ACTION_NOT_FOUND', id);
    const parsed = def.input.safeParse(input);
    if (!parsed.success) return fail(422, 'VALIDATION_FAILED', parsed.error.message);
    if (
      def.permission !== 'self' &&
      def.permission !== 'platform_admin' &&
      !can(authzCtx(), def.permission as PermissionKey)
    ) {
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
    if (def.undo && handler.undo)
      undoLog.set(logId, () => mutate((db) => handler.undo!(db, parsed.data as never)));
    if (def.risk !== 'read') recordActionLog(mockDb(), id, logId, def.risk, !!(def.undo && handler.undo));
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
    // dòng nhật ký mẫu (fixture) không có handler undo trong phiên — chỉ đổi trạng thái
    const seeded = mockDb().assistant.logs.find(
      (l) => l.id === actionLogId && l.undoable && !l.undone && !fn,
    );
    if (!fn && !seeded) fail(409, 'CONFLICT', 'UNDO_EXPIRED');
    fn?.();
    undoLog.delete(actionLogId);
    mutate((db) => markUndone(db, actionLogId), 'action.undo');
  },
};
