// Mock transport: đúng envelope Blueprint §4.1 + mock ActionExecutor áp policy nguồn `ui` (Blueprint §3.3).
import { getAction } from '@appchat/actions';
import { ApiRequestError, can, ROLE_DEFS, type PermissionKey, type StreamFrame } from '@appchat/shared';
import type { Transport } from '../transport';
import { mockHandlers } from './handlers';
import { mockRoutes } from './routes';
import { inboxParamRoute } from './domains/inbox';
import { customersParamRoute } from './domains/customers';
import { agentsParamRoute } from './domains/agents';
import { agentToolsParamRoute } from './domains/agent-tools';
import { productsParamRoute } from './domains/products';
import { withFieldPolicy } from './domains/field-policy';
import { importTexts, productImportRoute } from './domains/product-import';
import { dataJobsRoute } from './domains/data-jobs';
import { channelOperationsRoute } from './domains/channel-operations';
import { quotesParamRoute } from './domains/quotes';
import { quotePdf, quotesPublicRoute } from './domains/quotes-public';
import { publicDocumentPdf, publicDocumentRoute } from './domains/commerce-delivery';
import { contractFileBlob, contractFilesParamRoute, contractPdf, contractsParamRoute, mockUploads } from './domains/contracts';
import { appendixMock, contractsPosts } from './domains/contracts-actions';
import { ordersParamRoute } from './domains/orders';
import { invoicesParamRoute } from './domains/invoices';
import { contactPackagesParamRoute } from './domains/invoices-actions';
import { calendarParamRoute } from './domains/calendar';
import { ticketsParamRoute } from './domains/tickets';
import { marketingParamRoute } from './domains/marketing';
import { loyaltyFileBlob, loyaltyParamRoute } from './domains/loyalty';
import { kbSuggestionParamRoute } from './domains/kb-suggestions';
import { kbSourceBlob } from './domains/kb-folders';
import { settingsAppsParamRoute } from './domains/settings-apps';
import { assistantUiParamRoute, assistantUiPosts } from './domains/assistant-ui';
import { assistantSessionParamRoute } from './domains/assistant-sessions';
import { signParamPost, signParamRoute } from './domains/contracts-sign';
import { assistantPosts, markUndone, recordActionLog } from './domains/assistant';
import { mockPosts, taxLookup } from './auth-routes';
import { mockDb, mutate } from './store';
import { docTemplatePreview as mockBlob } from './domains/doc-templates';
import { claimVault, genUiNeedsPreview, putVault, splitSecrets } from './genui-vault';

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
      productImportRoute(path) ??
      dataJobsRoute(path) ??
      channelOperationsRoute(path) ??
      quotesParamRoute(path) ??
      quotesPublicRoute(path) ??
      publicDocumentRoute(path) ??
      contractsParamRoute(path) ??
      contractFilesParamRoute(path) ??
      appendixMock.route(path) ??
      ordersParamRoute(path) ??
      invoicesParamRoute(path) ??
      contactPackagesParamRoute(path) ??
      calendarParamRoute(path) ??
      ticketsParamRoute(path) ??
      marketingParamRoute(path) ??
      loyaltyParamRoute(path) ??
      kbSuggestionParamRoute(path) ??
      settingsAppsParamRoute(path) ??
      assistantUiParamRoute(path) ??
      assistantSessionParamRoute(path) ??
      signParamRoute(path) ??
      agentToolsParamRoute(path) ??
      agentsParamRoute(path) ??
      customersParamRoute(path) ??
      inboxParamRoute(path);
    if (!route) fail(404, 'NOT_FOUND', `mock route ${path}`);
    // Quyền theo trường (TIP-045b annex C): cùng luật server — chiếu custom / giá vốn, chặn lọc cf.* trường ẩn.
    return structuredClone(withFieldPolicy(path, route!)(mockDb(), params ?? {})) as never;
  },

  async post(path, body) {
    const handler = mockPosts[path] ?? assistantPosts[path] ?? assistantUiPosts[path] ?? signParamPost(path) ?? contractsPosts(path) ?? appendixMock.post(path);
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
    // GenUI: lần xác nhận mang vault → ghép ô bí mật trước khi validate.
    if (opts?.secretVault) {
      const merged = claimVault(opts.secretVault, input);
      if (!merged) return fail(409, 'CONFLICT', 'RE_ENTRY_REQUIRED');
      input = merged;
    }
    const parsed = def.input.safeParse(input);
    if (!parsed.success) return fail(422, 'VALIDATION_FAILED', parsed.error.message);
    if (
      def.permission !== 'self' &&
      def.permission !== 'platform_admin' &&
      !can(authzCtx(), def.permission as PermissionKey)
    ) {
      return fail(403, 'FORBIDDEN', id);
    }

    const { plain, secrets } = splitSecrets(def, parsed.data);
    const inputHash = JSON.stringify(plain);
    if ((def.bulk || genUiNeedsPreview(def, opts?.genuiIntent)) && !(opts?.confirmToken && confirmTokens.get(opts.confirmToken) === inputHash)) {
      const token = nextId('ct');
      confirmTokens.set(token, inputHash);
      const p = handler.preview?.(mockDb(), parsed.data as never) ?? { summary: id };
      const vault = opts?.genuiIntent ? putVault(secrets) : undefined;
      return {
        status: 202,
        data: {
          status: 'preview_required',
          preview: { ...p, risk: def.risk },
          confirm_token: token,
          expires_at: new Date(Date.now() + 600_000).toISOString(),
          ...(vault ? { secret_vault: vault } : {}),
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
    // Việc nền (202 job_accepted — TIP-032b): handler mock trả `{ __accepted: { job_id, status_url } }` như server khi xếp việc.
    const queued = (result as { __accepted?: { job_id: string; status_url: string } } | null)?.__accepted;
    if (queued) return { status: 202, data: { status: 'job_accepted', job_id: queued.job_id, action_log_id: logId, status_url: queued.status_url } };
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

  async upload(file, purpose, signal) {
    // Mock giữ metadata (FE chỉ cần id để gọi action); không lưu nội dung tệp. Huỷ trước khi xong → AbortError như fetch.
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const id = nextId('file');
    // Tên theo id để guard giả của hợp đồng từ tệp (TIP-030b) kiểm loại / tên.
    mockUploads.set(id, { name: file.name, size: file.size });
    // Nhập sản phẩm (TIP-032b): mock đọc chữ CSV để tách dòng như server.
    if (purpose === 'import') importTexts.set(id, { name: file.name, text: await file.text() });
    return { file_id: id, name: file.name, size: file.size };
  },

  async blob(path) {
    // Tải nguồn KB (TIP-020b): tệp → HTML có tên; URL / catalog → JSON mô tả như server.
    const kb = kbSourceBlob(mockDb(), path);
    if (kb) return kb;
    // Mock không có LibreOffice: bản xem trước là trang HTML đã điền dữ liệu minh hoạ (cùng renderRich với server).
    const html = mockBlob(mockDb(), path) ?? quotePdf(mockDb(), path) ?? contractPdf(mockDb(), path) ?? contractFileBlob(mockDb(), path) ?? loyaltyFileBlob(mockDb(), path) ?? publicDocumentPdf(path);
    if (html === null) return fail(404, 'NOT_FOUND', path);
    return new Blob([html], { type: 'text/html' });
  },

  async stream(path, body, onFrame) {
    // Mock không có SSE: lượt kịch bản trả cả danh sách event → phát thành frame theo thứ tự rồi `done` (cùng hợp đồng http).
    const turn = (await mockTransport.post<{ session_id: string; run_id: string | null; events: StreamFrame['event'][] }>(path, body)) ?? { session_id: '', run_id: null, events: [] };
    const run = turn.run_id ?? nextId('run');
    const events: StreamFrame['event'][] = [...turn.events, { type: 'done', status: 'completed', session_id: turn.session_id }];
    events.forEach((event, i) => onFrame({ run_id: run, seq: i + 1, cursor: `mock-${i + 1}`, event }));
    return { finished: true, cursor: `mock-${events.length}` };
  },
};
