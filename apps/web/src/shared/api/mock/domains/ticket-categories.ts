// Mock từ điển gợi ý danh mục ticket (TIP-034b; server: packages/core/src/support/categories/*). Cấu hình nằm ở `db.tickets.categoryConfig`
// (null = bản ảo version 0, 8 nhãn prototype). `ticket_categories.replace` CAS `if_version` + validator dùng chung (422 theo `labels.<i>`),
// preview trước / sau + cảnh báo ticket cũ giữ nguyên, undo khôi phục bộ trước ở version mới; nhãn đã dùng chỉ từ ticket người xem thấy
// (cùng vị từ `ticketVisible` của danh sách), trang ≤ 50, cursor = nhãn cuối (mock không ký). Đổi cấu hình phát `ticket_categories.config`.
import {
  ApiRequestError,
  CATEGORY_CONFIG_KEY,
  DEFAULT_CATEGORY_LABELS,
  categoryFieldErrors,
  diffCategoryLabels,
  isValidCategoryConfig,
  validateCategoryLabels,
  type CategorySuggestions,
  type TicketCategoryConfig,
} from '@appchat/shared';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import type { MockHandler } from '../handlers';
import { ticketVisible } from './ticket-scope';

export interface CategoryConfigState {
  version: number;
  labels: string[];
  updated_at: string;
}

const PAGE = 50;
const ADMIN = new Set(['owner', 'manager']);
const deny = () => new ApiRequestError(403, { code: 'FORBIDDEN', message: 'settings.manage', fields: { permission: 'settings.manage' } });

export function categoryConfig(db: MockDb): TicketCategoryConfig {
  const c = db.tickets.categoryConfig;
  const labels = c?.labels ?? [...DEFAULT_CATEGORY_LABELS];
  return { version: c?.version ?? 0, labels, default: labels[0] ?? '', updated_at: c?.updated_at ?? null };
}

/** Nhãn đã dùng trong ticket người xem thấy — thứ tự byte (như collation "C" của server), sau `after`. */
function usedLabels(db: MockDb, after: string | null) {
  const seen = db.tickets.tickets.filter((t) => ticketVisible(db, t));
  const all = [...new Set(seen.map((t) => t.category).filter(Boolean))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const rest = after === null ? all : all.filter((l) => l > after);
  return { labels: rest.slice(0, PAGE), more: rest.length > PAGE };
}

export function categorySuggestions(db: MockDb, cursor?: string): CategorySuggestions {
  const used = usedLabels(db, cursor ?? null);
  return { config: categoryConfig(db), used: used.labels, next_cursor: used.more ? used.labels.at(-1)! : null };
}

/** Meta danh sách ticket: cấu hình trước rồi trang đầu nhãn đã dùng (khử trùng). */
export function categoryMeta(db: MockDb) {
  const c = categoryConfig(db);
  const used = usedLabels(db, null);
  return { categories: [...new Set([...c.labels, ...used.labels])], category_config: { version: c.version, labels: c.labels, default: c.default }, used_has_more: used.more };
}

export const ticketCategoryRoutes: Record<string, MockRoute> = {
  '/settings/ticket-categories': (db) => {
    if (!ADMIN.has(db.role)) throw deny();
    return categoryConfig(db);
  },
  '/support/category-suggestions': (db, p) => categorySuggestions(db, typeof p.cursor === 'string' && p.cursor ? p.cursor : undefined),
};

type ReplaceIn = { labels: string[]; if_version: number };
/** Bộ trước của mỗi lần thay (undo của mock-transport nhận lại input) — khoá theo version sau. */
const history = new Map<number, string[]>();

function checked(db: MockDb, i: ReplaceIn) {
  if (!ADMIN.has(db.role)) throw deny();
  const v = validateCategoryLabels(i.labels);
  if (!isValidCategoryConfig(v)) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'labels', fields: categoryFieldErrors(v) });
  const cur = categoryConfig(db);
  if (cur.version !== i.if_version) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: 'version', fields: { version: String(cur.version) } });
  return { labels: v.labels, cur };
}

export const ticketCategoryHandlers: Record<string, MockHandler> = {
  'ticket_categories.get': {
    execute: (db) => {
      if (!ADMIN.has(db.role)) throw deny();
      const c = categoryConfig(db);
      return { version: c.version, labels: c.labels, default: c.default };
    },
  },
  'ticket_categories.replace': {
    preview: (db, i: ReplaceIn) => {
      const { labels, cur } = checked(db, i);
      const d = diffCategoryLabels(cur.labels, labels);
      return {
        summary: `${labels[0]} · ${labels.length}`,
        count: labels.length,
        changes: [{ entity: 'ticket_category_config', id: CATEGORY_CONFIG_KEY, before: { labels: cur.labels, version: cur.version }, after: { labels, ...d } }],
        warnings: ['existing_tickets_unchanged'],
      };
    },
    execute: (db, i: ReplaceIn) => {
      const { labels, cur } = checked(db, i);
      const version = cur.version + 1;
      history.set(version, cur.labels);
      db.tickets.categoryConfig = { version, labels, updated_at: new Date().toISOString() };
      return { version, labels, default: labels[0] };
    },
    undo: (db, i: ReplaceIn) => {
      const after = i.if_version + 1;
      const c = categoryConfig(db);
      if (c.version !== after) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: 'version', fields: { version: String(c.version) } });
      db.tickets.categoryConfig = { version: after + 1, labels: history.get(after) ?? [...DEFAULT_CATEGORY_LABELS], updated_at: new Date().toISOString() };
    },
  },
  'ticket.category_suggestions': {
    execute: (db, i: { cursor?: string }) => {
      const s = categorySuggestions(db, i.cursor);
      return { config: { version: s.config.version, labels: s.config.labels, default: s.config.default }, used: s.used, next_cursor: s.next_cursor };
    },
  },
};
