// Đọc domain catalog cho apps/api (Blueprint §4.4 catalog — shape packages/shared/src/api/catalog.ts). Mỗi lệnh đọc mở một
// transaction trên DB tenant của workspace (TenantDbResolver). Catalog không có data scope (rbac §5): ai có `catalog.view` thấy
// mọi sản phẩm; giá vốn theo `catalog.cost_view`, trường tuỳ biến theo vai trò (FieldPolicy, product-view).
import { AppError, SALES_SOURCES, categoryPal, createFmt, type AuthzContext } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { CrmMembers } from '../../crm/public';
import { assertQueryFields, fieldView } from '../../authz/public';
import { listProductIds, productStats, type ProductFilter } from '../repos/products.repo';
import { productActivity } from './activity';
import { UUID } from './catalog-write';
import { docOf } from '../description/view';
import { listMedia } from '../media/read';
import { PRODUCT_SELECT, attrsOf, categoryMap, connectedChannelTypes, partCounts, toRow, type ProductRecord, type ViewCtx } from './product-view';

export interface Viewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const MAX_LIMIT = 100;

export class CatalogReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly platform: Pick<PlatformDb, 'user' | 'workspace'>,
    private readonly members: CrmMembers,
    private readonly now: () => Date,
  ) {}

  private async tx<T>(v: Viewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    const db = await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    return db.$transaction(fn);
  }

  private async place(v: Viewer) {
    const [u, ws] = await Promise.all([
      this.platform.user.findUnique({ where: { id: v.userId }, select: { locale: true } }),
      this.platform.workspace.findUnique({ where: { id: v.workspaceId }, select: { timezone: true } }),
    ]);
    return { locale: u?.locale ?? 'vi', timeZone: ws?.timezone ?? 'Asia/Ho_Chi_Minh' };
  }

  private async view(tx: TenantTx, v: Viewer, locale: string): Promise<ViewCtx> {
    const [cats, channels, fields] = await Promise.all([categoryMap(tx), connectedChannelTypes(tx), fieldView(tx, 'product', v.authz)]);
    return { authz: v.authz, locale, categories: cats.map, channels, fields };
  }

  /** Bước 2 deferred join: đủ cột chỉ cho các id đã chọn, giữ thứ tự bước 1. */
  private async rowsOf(tx: TenantTx, ctx: ViewCtx, ids: string[]) {
    const [rows, parts] = await Promise.all([ids.length ? tx.product.findMany({ where: { id: { in: ids } }, select: PRODUCT_SELECT }) : [], partCounts(tx, ids)]);
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    return rows.map((r) => toRow(r as ProductRecord, ctx, parts.get(r.id) ?? 0));
  }

  async list(v: Viewer, f: ProductFilter, page?: number, limit?: number) {
    const lim = Math.min(MAX_LIMIT, Math.max(1, limit ?? 20));
    const paged = page !== undefined;
    const pg = Math.max(1, page ?? 1);
    const pl = await this.place(v);
    return this.tx(v, async (tx) => {
      const ctx = await this.view(tx, v, pl.locale);
      // Lọc trên trường bị ẩn → 422 trước truy vấn (không để tổng / rỗng làm kênh dò giá trị).
      assertQueryFields(ctx.fields, f.custom);
      const { ids, total } = await listProductIds(tx, f, paged ? { offset: (pg - 1) * lim, limit: lim } : null);
      const data = await this.rowsOf(tx, ctx, ids);
      const pages = Math.max(1, Math.ceil(total / lim));
      return { data, next_cursor: paged && pg < pages ? String(pg + 1) : null, meta: { total, page: paged ? pg : 1, limit: paged ? lim : data.length } };
    });
  }

  /** Chi tiết (drawer + form sửa): dòng + thành phần combo + định nghĩa thuộc tính + biến thể. */
  async get(v: Viewer, id: string) {
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
    const pl = await this.place(v);
    return this.tx(v, async (tx) => {
      const p = await tx.product.findFirst({ where: { id, deletedAt: null }, select: { ...PRODUCT_SELECT, descriptionDoc: true } });
      if (!p) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
      const [parts, variants] = await Promise.all([
        tx.productComponent.findMany({ where: { productId: id }, select: { childId: true, qty: true, child: { select: { name: true } } } }),
        // Biến thể đã lưu trữ không hiện để chọn cho dòng mới (TIP-032b); dòng cũ giữ id + tên đã chụp.
        tx.productVariant.findMany({ where: { productId: id, status: 'active' }, orderBy: [{ sku: 'asc' }], select: { id: true, sku: true, name: true, stock: true, price: true, version: true } }),
      ]);
      const row = toRow(p as ProductRecord, await this.view(tx, v, pl.locale), parts.length);
      const media = await listMedia(tx, v.authz, id);
      return { ...row, ...docOf(p.descriptionDoc), media, components: parts.map((c) => ({ id: c.childId, name: c.child.name, qty: c.qty })), attr_defs: attrsOf(p.attrs), variants: variants.map((x) => ({ ...x, price: x.price === null ? null : String(x.price) })) };
    });
  }

  /** Danh mục + màu, KPI thật, kênh bán (kênh đã kết nối = `synced`; sàn / phần mềm bán hàng = sắp có — D04). */
  async meta(v: Viewer) {
    const pl = await this.place(v);
    const fmt = createFmt(pl);
    return this.tx(v, async (tx) => {
      const now = this.now();
      const [cats, stats, accounts] = await Promise.all([
        categoryMap(tx),
        productStats(tx, now, pl.timeZone),
        tx.channelAccount.findMany({ where: { status: 'connected', pausedAt: null }, select: { type: true, lastEventAt: true, updatedAt: true } }),
      ]);
      const lastOf = (type: string) => accounts.filter((a) => a.type === type).map((a) => (a.lastEventAt ?? a.updatedAt).getTime());
      type Src = { key: string; color: string; status: 'synced' | 'soon'; at?: string };
      const sync_sources = SALES_SOURCES.flatMap((s): Src[] => {
        if (!s.channel) return [{ key: s.key, color: s.color, status: 'soon' }];
        const at = lastOf(s.key);
        return at.length ? [{ key: s.key, color: s.color, status: 'synced', at: fmt.time(new Date(Math.max(...at))) }] : [];
      });
      return {
        categories: cats.rows.map((c) => c.name),
        category_color: Object.fromEntries(cats.rows.map((c) => [c.name, c.color])),
        category_pal: Object.fromEntries(cats.rows.map((c) => [c.name, categoryPal(c.color)])),
        sync_sources,
        stats: { total: stats.total, active: stats.active, channels: new Set(accounts.map((a) => a.type)).size, sold_month: stats.soldMonth },
        // Tệp / khách mua / chứng từ theo sản phẩm có dữ liệu từ TIP-029 (báo giá) / TIP-031 (đơn) — tới lúc đó trống thật.
        files: [],
        history: [],
        crm_stats: [],
        crm_buyers: [],
      };
    });
  }

  async categories(v: Viewer) {
    return this.tx(v, async (tx) => {
      const [cats, counts] = await Promise.all([
        categoryMap(tx),
        tx.product.groupBy({ by: ['categoryId'], where: { deletedAt: null }, _count: { _all: true } }),
      ]);
      const by = new Map(counts.map((c) => [c.categoryId, c._count._all]));
      return cats.rows.map((c) => ({ id: c.id, name: c.name, color: c.color, count: by.get(c.id) ?? 0 }));
    });
  }

  /** Lịch sử sản phẩm (tab Lịch sử): nhật ký thao tác `product.*` + sổ kho, mới nhất trước. */
  async activity(v: Viewer, id: string) {
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
    const pl = await this.place(v);
    return this.tx(v, async (tx) => {
      if (!(await tx.product.findUnique({ where: { id }, select: { id: true } }))) throw new AppError('NOT_FOUND', 404, { product_id: 'not_found' });
      return productActivity(tx, id, { ...pl, names: (ids) => this.members.names(ids) });
    });
  }
}
