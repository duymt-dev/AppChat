// Đọc gợi ý danh mục ticket (TIP-034b §2): bộ cấu hình (gợi ý vận hành chung của workspace — người đọc ticket thấy, không cần
// settings.manage) + một trang nhãn ĐÃ DÙNG chỉ trong ticket người xem đang thấy (cùng `supportScopeSql` với danh sách / chi tiết —
// TIP-042c). Không distinct toàn cục, không đếm số lần dùng, không id ticket. Trang ≤ 50 nhãn, thứ tự byte (collation "C") ổn định;
// cursor mờ ký HMAC gắn workspace + người xem + thế hệ scope — mỗi trang kiểm lại scope hiện tại. Ticket chưa có xoá / cách ly riêng
// (privacy support chưa xoá — adapter.ts) nên cổng đọc duy nhất là scope.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { AppError, type AuthzContext, type CategorySuggestions, type TicketCategoryConfig } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { levelOf } from '../../authz/data-access';
import { supportScopeSql } from '../ticket-access';
import { configDto, readCategoryConfig, type CategoryConfig } from './repository';

export const USED_PAGE = 50;

/** Thế hệ scope đọc support hiện tại — đổi mức scope hoặc tập nhóm thì cursor cũ hết hiệu lực. */
export const scopeGeneration = (authz: AuthzContext): string =>
  createHash('sha256').update(`${levelOf(authz, 'support', 'read')}|${[...authz.teamIds].sort().join(',')}`).digest('base64url').slice(0, 12);

export class CategoryCursors {
  constructor(private readonly secret: string | null) {}

  private mac(ws: string, userId: string, gen: string, after: string): string {
    if (!this.secret) throw new AppError('NOT_IMPLEMENTED', 501, undefined, 'APP_ENC_KEY chưa cấu hình');
    return createHmac('sha256', this.secret).update(`${ws}|${userId}|${gen}|${after}`).digest('base64url').slice(0, 22);
  }

  sign(ws: string, authz: AuthzContext, after: string): string {
    const gen = scopeGeneration(authz);
    return `${Buffer.from(after, 'utf8').toString('base64url')}.${gen}.${this.mac(ws, authz.userId, gen, after)}`;
  }

  /** Cursor hợp lệ → nhãn cuối trang trước. Sửa / chéo người / workspace → 403; scope đã đổi → 409 (đọc lại từ đầu). */
  verify(ws: string, authz: AuthzContext, cursor: string): string {
    const m = /^([A-Za-z0-9_-]{1,400})\.([A-Za-z0-9_-]{12})\.([A-Za-z0-9_-]{22})$/.exec(cursor);
    const deny = () => new AppError('FORBIDDEN', 403, { cursor: 'invalid' });
    if (!m) throw deny();
    const after = Buffer.from(m[1]!, 'base64url').toString('utf8');
    const want = Buffer.from(this.mac(ws, authz.userId, m[2]!, after));
    const got = Buffer.from(m[3]!);
    if (want.length !== got.length || !timingSafeEqual(want, got)) throw deny();
    if (m[2] !== scopeGeneration(authz)) throw new AppError('CONFLICT', 409, { cursor: 'stale' });
    return after;
  }
}

/**
 * Một trang nhãn đã dùng trong ticket người xem thấy — chỉ chiếu cột `category`, so / sắp theo collation "C" (khớp cursor).
 * Scope all: quét nhảy (recursive CTE, mỗi nhãn một lần dò `ticket_category_c_idx`) — không đọc hết ticket của nhãn phổ biến.
 * Scope own / team: `supportScopeSql` (BitmapOr trên index `(assignee | creator | team, category)`) rồi DISTINCT; none → rỗng, không truy vấn.
 */
export async function usedLabels(tx: TenantTx, authz: AuthzContext, after: string | null, limit = USED_PAGE): Promise<{ labels: string[]; more: boolean }> {
  const level = levelOf(authz, 'support', 'read');
  if (level === 'none') return { labels: [], more: false };
  const from = after ?? '';
  const rows =
    level === 'all'
      ? await tx.$queryRaw<{ category: string }[]>`
          WITH RECURSIVE c AS (
            (SELECT t.category COLLATE "C" AS v FROM ticket t WHERE t.category COLLATE "C" > ${from} ORDER BY 1 LIMIT 1)
            UNION ALL
            SELECT (SELECT t.category COLLATE "C" FROM ticket t WHERE t.category COLLATE "C" > c.v ORDER BY 1 LIMIT 1) FROM c WHERE c.v IS NOT NULL
          )
          SELECT v AS category FROM c WHERE v IS NOT NULL LIMIT ${limit + 1}`
      : await tx.$queryRaw<{ category: string }[]>`
          SELECT DISTINCT t.category COLLATE "C" AS category FROM ticket t
          WHERE ${supportScopeSql(authz)} AND t.category COLLATE "C" > ${from}
          ORDER BY 1 LIMIT ${limit + 1}`;
  return { labels: rows.slice(0, limit).map((r) => r.category), more: rows.length > limit };
}

export const configView = (c: CategoryConfig): TicketCategoryConfig => ({ ...configDto(c), updated_at: c.updatedAt?.toISOString() ?? null });

/** Gợi ý cho người xử lý ticket (action `ticket.category_suggestions` + GET /support/category-suggestions). */
export async function categorySuggestions(tx: TenantTx, ws: string, authz: AuthzContext, cursors: CategoryCursors, cursor?: string): Promise<CategorySuggestions> {
  const after = cursor ? cursors.verify(ws, authz, cursor) : null;
  const [config, used] = await Promise.all([readCategoryConfig(tx), usedLabels(tx, authz, after)]);
  const last = used.labels.at(-1);
  return { config: configView(config), used: used.labels, next_cursor: used.more && last !== undefined ? cursors.sign(ws, authz, last) : null };
}

/** Gợi ý cho meta danh sách ticket: bộ cấu hình trước, rồi trang đầu nhãn đã dùng (khử trùng đúng chuỗi). */
export async function categoryMeta(tx: TenantTx, authz: AuthzContext) {
  const [config, used] = await Promise.all([readCategoryConfig(tx), usedLabels(tx, authz, null)]);
  return { categories: [...new Set([...config.labels, ...used.labels])], category_config: configDto(config), used_has_more: used.more };
}

export interface CategoryViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

/** Đọc cho controller (transaction tenant của người xem). */
export class TicketCategoriesRead {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly cursors: CategoryCursors,
  ) {}

  private async tx<T>(v: CategoryViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return (await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId))).$transaction(fn);
  }

  /** Cài đặt › Danh mục ticket (settings.manage): CHỈ bộ cấu hình — không liệt kê nhãn đã dùng. */
  config(v: CategoryViewer): Promise<TicketCategoryConfig> {
    return this.tx(v, async (tx) => configView(await readCategoryConfig(tx)));
  }

  suggestions(v: CategoryViewer, cursor?: string): Promise<CategorySuggestions> {
    return this.tx(v, (tx) => categorySuggestions(tx, v.workspaceId, v.authz, this.cursors, cursor));
  }
}
