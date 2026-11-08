// Đọc domain crm cho apps/api (Blueprint §4.4 crm — shape packages/shared/src/api/crm.ts). Mỗi lệnh đọc mở một transaction
// chỉ-đọc trên DB tenant của workspace (TenantDbResolver) và áp scope crm của người xem (rbac §5 — không có đường vòng).
import { AppError, CONTACT_STAGES, STAGE_COLOR, STAGE_LOST_COLOR, createFmt, tagTone, utcToWall, type ActivityKind, type AuthzContext, type CustomFieldEntity } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { boardCounts, listContactIds, stageCounts, type ContactFilter } from '../repos/contacts.repo';
import { BOARD_DEFAULT, BOARD_MAX, boardColumnIds, decodeBoardCursor } from '../repos/board-page';
import { UUID, visibleContact } from './access';
import { contact360, withActivities } from './contact360';
import { ROW_SELECT, loadRowExtras, toRow, type ContactRecord } from './contact-view';
import { nextActions } from '../insights/next-action';
import { crmAi, insights360 } from '../insights/read';
import { recentFacts, sourceOf } from '../memory/read';
import { MEMORY_CAP } from '../memory/normalize';
import { duplicateGroups } from './duplicates.service';
import { fieldsData } from './fields.service';
import { layoutForRole, layoutsData } from './layouts.service';
import type { CrmMembers } from './members.service';
import type { FileLinks } from '../../kernel/files/file-links';
import { renderTimeline } from './timeline.service';
import { assertQueryFields, fieldView, projectCustom } from '../../authz/public';
import { contactEditContext } from './contact-edit';
import { activityPage, activitySummary } from '../activities/read.service';
import { transferStatus } from '../ownership/read';
import { familyIds } from '../lifecycle/lock';

export interface Viewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const MAX_LIMIT = 100;
/** Số thẻ trang đầu mỗi cột kanban (đếm vẫn đủ; trang sau qua `next_cursor` — TIP-026b). */
export const BOARD_PER_STAGE = BOARD_DEFAULT;
const TL_PAGE = 30;

export class CrmReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly platform: Pick<PlatformDb, 'user' | 'workspace'>,
    private readonly members: CrmMembers,
    private readonly now: () => Date,
    private readonly links: FileLinks | null = null,
  ) {}

  private async tx<T>(v: Viewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    const db = await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    return db.$transaction(fn);
  }

  /** Locale của người xem + múi giờ workspace (hiển thị ngày). */
  private async place(v: Viewer) {
    const [u, ws] = await Promise.all([
      this.platform.user.findUnique({ where: { id: v.userId }, select: { locale: true } }),
      this.platform.workspace.findUnique({ where: { id: v.workspaceId }, select: { timezone: true } }),
    ]);
    return { locale: u?.locale ?? 'vi', timeZone: ws?.timezone ?? 'Asia/Ho_Chi_Minh' };
  }

  /** Bước 2 deferred join: đủ cột chỉ cho các id đã chọn, giữ thứ tự bước 1. */
  private async rowsOf(tx: TenantTx, v: Viewer, pl: { locale: string; timeZone: string }, ids: string[]) {
    const rows = ids.length ? await tx.contact.findMany({ where: { id: { in: ids } }, select: ROW_SELECT }) : [];
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    const now = this.now();
    const [extras, names, next, fv] = await Promise.all([
      loadRowExtras(tx, ids),
      this.members.names(rows.map((r) => r.ownerUserId)),
      nextActions(tx, v.authz, rows, utcToWall(now, pl.timeZone).date, now),
      fieldView(tx, 'contact', v.authz),
    ]);
    // Quyền theo trường (TIP-045b annex C): chỉ key tuỳ biến được thấy — dữ liệu lưu giữ nguyên.
    return rows.map((r) => toRow({ ...(r as ContactRecord), custom: projectCustom(fv, r.custom) }, { authz: v.authz, ...pl, names }, { ...extras, next }));
  }

  async list(v: Viewer, f: ContactFilter, page?: number, limit?: number) {
    const lim = Math.min(MAX_LIMIT, Math.max(1, limit ?? 20));
    const paged = page !== undefined;
    const pg = Math.max(1, page ?? 1);
    const pl = await this.place(v);
    return this.tx(v, async (tx) => {
      // Lọc trên trường bị ẩn → 422 TRƯỚC truy vấn (không làm kênh dò giá trị qua số đếm).
      assertQueryFields(await fieldView(tx, 'contact', v.authz), f.custom);
      const { ids, total } = await listContactIds(tx, v.authz, f, paged ? { offset: (pg - 1) * lim, limit: lim } : null);
      const data = await this.rowsOf(tx, v, pl, ids);
      const pages = Math.max(1, Math.ceil(total / lim));
      return { data, next_cursor: paged && pg < pages ? String(pg + 1) : null, meta: { total, page: paged ? pg : 1, limit: paged ? lim : data.length } };
    });
  }

  /** Kanban (TIP-026 / 026b §4.1): cột theo giai đoạn, đếm theo bộ lọc + scope, trang đầu ≤ 50 thẻ + `next_cursor` mỗi cột. */
  async board(v: Viewer, f: ContactFilter) {
    const pl = await this.place(v);
    return this.tx(v, async (tx) => {
      assertQueryFields(await fieldView(tx, 'contact', v.authz), f.custom);
      const counts = await boardCounts(tx, v.authz, f);
      const keys = CONTACT_STAGES.filter((k) => k !== 'lost' || (counts.lost ?? 0) > 0);
      const pages = await Promise.all(keys.map((k) => ((counts[k] ?? 0) > 0 ? boardColumnIds(tx, v.authz, f, k, null, BOARD_PER_STAGE) : { ids: [], next: null })));
      const rows = await this.rowsOf(tx, v, pl, pages.flatMap((p) => p.ids));
      return {
        columns: keys.map((key, i) => ({ key, color: key === 'lost' ? STAGE_LOST_COLOR : STAGE_COLOR[key], total: counts[key] ?? 0, rows: rows.filter((r) => r.stage === key), next_cursor: pages[i]!.next })),
        limit: BOARD_PER_STAGE,
      };
    });
  }

  /** Một trang của một cột (TIP-026b §4.1): `GET /contacts/board/:stage?cursor=&limit=` — mặc định 50, tối đa 100; cursor gắn cột + bộ lọc. */
  async boardColumn(v: Viewer, f: ContactFilter, stage: string, q: { cursor?: string; limit?: number }) {
    if (!(CONTACT_STAGES as readonly string[]).includes(stage)) throw new AppError('VALIDATION_FAILED', 400, { stage: 'invalid' });
    const pl = await this.place(v);
    return this.tx(v, async (tx) => {
      assertQueryFields(await fieldView(tx, 'contact', v.authz), f.custom);
      const cursor = decodeBoardCursor(q.cursor, stage, f);
      const page = await boardColumnIds(tx, v.authz, f, stage, cursor, Math.min(Math.max(q.limit ?? BOARD_DEFAULT, 1), BOARD_MAX));
      return { data: await this.rowsOf(tx, v, pl, page.ids), next_cursor: page.next };
    });
  }

  async stats(v: Viewer) {
    const pl = await this.place(v);
    const fmt = createFmt(pl);
    return this.tx(v, async (tx) => {
      const counts = await stageCounts(tx, v.authz);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const open = (counts.consulting ?? 0) + (counts.quote ?? 0) + (counts.contract ?? 0);
      const tags = await tx.tag.findMany({ where: { scope: { in: ['all', 'contact'] } }, orderBy: { createdAt: 'asc' }, take: 20, select: { id: true, name: true, color: true } });
      return {
        stats: [
          { key: 'total', value: fmt.number(total), color: '#2563EB', icon: 'ic-users' },
          { key: 'leads', value: fmt.number(counts.lead ?? 0), color: '#16A34A', icon: 'ic-chart' },
          { key: 'deals', value: fmt.number(open), color: '#6E48E6', icon: 'ic-spark' },
          // LTV trung bình cần đơn hàng (TIP-028) — tới lúc đó 0.
          { key: 'ltv', value: '0', color: '#C9820B', icon: 'ic-gift' },
        ],
        stages: (Object.keys(STAGE_COLOR) as (keyof typeof STAGE_COLOR)[]).map((key) => ({ key, color: STAGE_COLOR[key], count: key === 'all' ? total : (counts[key] ?? 0) })),
        tag_defs: tags.map((t) => ({ id: t.id, label: t.name, ...tagTone(t.color) })),
      };
    });
  }

  async duplicates(v: Viewer) {
    const pl = await this.place(v);
    return this.tx(v, (tx) => duplicateGroups(tx, v.authz, pl.locale, pl.timeZone));
  }

  async get360(v: Viewer, id: string) {
    const pl = await this.place(v);
    const role = await this.members.roleOf(v.workspaceId, v.userId);
    return this.tx(v, async (tx) => {
      const { writable } = await visibleContact(tx, v.authz, id);
      const [p360, ins, fv, acts] = await Promise.all([
        contact360(tx, id, { ...pl, names: (ids) => this.members.names(ids), layout: await layoutForRole(tx, role), links: { files: this.links, ws: v.workspaceId } }),
        insights360(tx, v.authz, id, { ...pl, now: this.now() }),
        fieldView(tx, 'contact', v.authz),
        // TIP-026b: hoạt động CRM thật theo quyền người xem (cùng reader với GET /contacts/:id/activities).
        activitySummary(tx, id, writable, { authz: v.authz, locale: pl.locale, names: (ids) => this.members.names(ids), activeMembers: async () => new Set((await this.members.list(v.workspaceId)).map((m) => m.id)) }),
      ]);
      return { ...withActivities(p360, acts, pl), custom: projectCustom(fv, p360.custom), crm: { ...p360.crm, kpis: ins.kpis, recent_order: ins.recent_order, recent_payment: ins.recent_payment }, insights: ins.insights };
    });
  }

  /** `GET /v1/contacts/:id/activities` (TIP-026b) — cùng reader với action contact_activity.list. */
  async activities(v: Viewer, id: string, q: { kind: ActivityKind; cursor?: string; limit?: number; activityId?: string }) {
    const pl = await this.place(v);
    return this.tx(v, (tx) => activityPage(tx, id, q, { authz: v.authz, locale: pl.locale, names: (ids) => this.members.names(ids), activeMembers: async () => new Set((await this.members.list(v.workspaceId)).map((m) => m.id)) }));
  }

  /** `GET /v1/contacts/:id/transfers/:transferId` (TIP-015d) — cùng reader với action contact.transfer_status. */
  async transfer(v: Viewer, id: string, transferId: string, q: { cursor?: string; limit?: number }) {
    return this.tx(v, (tx) => transferStatus(tx, v.authz, id, transferId, q));
  }

  /** `GET /v1/contacts/:id/edit-context` (TIP-025b §D.3) — cùng reader với action contact.get_edit_context. */
  async editContext(v: Viewer, id: string) {
    return this.tx(v, (tx) => contactEditContext(tx, v.authz, id, (ids) => this.members.names(ids)));
  }

  /** `GET /v1/contacts/:id/memory` (TIP-015b): khối "AI ghi nhớ" — cùng dữ liệu action contact.memory_list. */
  async memory(v: Viewer, id: string) {
    return this.tx(v, async (tx) => {
      const { contact, writable } = await visibleContact(tx, v.authz, id);
      const rows = await recentFacts(tx, contact.id, MEMORY_CAP);
      return {
        items: rows.map((r) => ({ memory_id: r.id, fact: r.fact, confidence: r.confidence, source: sourceOf(r.actor_type), updated_at: r.updated_at.toISOString() })),
        cap: MEMORY_CAP,
        can_edit: writable && (v.authz.isOwner || v.authz.permissions.has('crm.edit')),
      };
    });
  }

  /** `GET /v1/crm/ai` (TIP-015b): run AI thật theo phạm vi người xem. */
  async ai(v: Viewer) {
    return this.tx(v, (tx) => crmAi(tx, v.authz));
  }

  async timeline(v: Viewer, id: string, cursor?: string) {
    const pl = await this.place(v);
    return this.tx(v, async (tx) => {
      await visibleContact(tx, v.authz, id);
      const [at, cid] = (cursor ?? '').split('_');
      const after = at && cid && UUID.test(cid) && !Number.isNaN(Date.parse(at)) ? { OR: [{ occurredAt: { lt: new Date(at) } }, { occurredAt: new Date(at), id: { lt: cid } }] } : {};
      const rows = await tx.timelineEvent.findMany({
        // TIP-015e: timeline giữ id khách gốc sau gộp — đọc theo họ.
        where: { contactId: { in: await familyIds(tx, id) }, ...after },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: TL_PAGE + 1,
        select: { id: true, type: true, summary: true, payload: true, occurredAt: true },
      });
      const page = rows.slice(0, TL_PAGE);
      const last = page.at(-1);
      return { data: renderTimeline(page, pl.locale, pl.timeZone), next_cursor: rows.length > TL_PAGE && last ? `${last.occurredAt.toISOString()}_${last.id}` : null };
    });
  }

  async collaborators(v: Viewer, id: string) {
    return this.tx(v, async (tx) => {
      const { contact } = await visibleContact(tx, v.authz, id);
      const list = await tx.contactCollaborator.findMany({ where: { contactId: id }, orderBy: { createdAt: 'asc' } });
      const names = await this.members.names([contact.ownerUserId, ...list.map((c) => c.userId)]);
      return {
        owner: { user_id: contact.ownerUserId ?? '', name: contact.ownerUserId ? (names.get(contact.ownerUserId) ?? '') : '' },
        collaborators: list.map((c) => ({ user_id: c.userId, role: c.role, name: names.get(c.userId) ?? '' })),
      };
    });
  }

  /** Yêu cầu chờ duyệt người xem được quyết: khách mình phụ trách, hoặc mọi khách nếu có `crm.reassign`. */
  async accessRequests(v: Viewer, status = 'pending') {
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new AppError('VALIDATION_FAILED', 422, { status: 'invalid' });
    const all = v.authz.isOwner || v.authz.permissions.has('crm.reassign');
    return this.tx(v, async (tx) => {
      const reqs = await tx.contactAccessRequest.findMany({ where: { status: status as 'pending' }, orderBy: { createdAt: 'desc' }, take: 200 });
      const contacts = await tx.contact.findMany({ where: { id: { in: reqs.map((r) => r.contactId) } }, select: { id: true, name: true, ownerUserId: true, deletedAt: true } });
      const by = new Map(contacts.map((c) => [c.id, c]));
      const mine = reqs.filter((r) => {
        const c = by.get(r.contactId);
        return c && !c.deletedAt && (all || c.ownerUserId === v.userId);
      });
      const names = await this.members.names(mine.map((r) => r.requesterUserId));
      return mine.map((r) => ({
        id: r.id,
        contact_id: r.contactId,
        requester_user_id: r.requesterUserId,
        status: r.status,
        ...(r.note ? { note: r.note } : {}),
        requester_name: names.get(r.requesterUserId) ?? '',
        contact_name: by.get(r.contactId)?.name,
      }));
    });
  }

  async fields(v: Viewer, entity: CustomFieldEntity) {
    return this.tx(v, (tx) => fieldsData(tx, entity, this.now()));
  }

  async layouts(v: Viewer) {
    const pl = await this.place(v);
    return this.tx(v, (tx) => layoutsData(tx, (ids) => this.members.names(ids), pl.locale));
  }
}
