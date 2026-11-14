// Reader xuất 3 tập hoạt động CRM (TIP-026b §5): chốt id hoạt động trên tập khách THẤY được (cùng `where` danh sách khách — scope crm
// hiện tại + bộ lọc khách) + điều kiện của tập, thứ tự ổn định (khách → thời điểm → id). Dựng dòng theo lô id: lọc lại scope khách HIỆN
// TẠI rồi nạp theo PK (deferred join). Cột id / thời điểm / trạng thái là cột chỉ đọc (nhập lại → loại). Giá trị kỳ vọng cơ hội chỉ có khi
// người xuất đọc được tiền báo giá — thiếu quyền: cột vắng hẳn khỏi tệp (không 0 / trống giả). Thân ghi chú là chữ (không công thức).
import { TenantSql as Prisma } from '@appchat/db';
import { OPPORTUNITY_PROBABILITY, OPPORTUNITY_STAGES, serverMessages, type AuthzContext, type ListExportKind } from '@appchat/shared';
import { contactWhereSql, crmScopeSql, type ContactFilter } from '../../crm/public';
import { canReadAmount } from '../../crm/activities/authority';
import { day, money, stamp } from './export-columns';
import type { Cell, ExportColumn, ExportDb, ExportLabels, ExportPlace, ListReader } from './types';

type In = Record<string, unknown>;
type Filter = { contact: ContactFilter; contactId?: string; kind?: string; state?: string; oppStage?: string; archived?: boolean };
type Table = 'contact_note' | 'contact_task' | 'contact_opportunity';

const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idList = (xs: string[]) => Prisma.join(xs.map((x) => Prisma.sql`${x}::uuid`));
const labelsOf = (p: ExportPlace) => serverMessages(p.locale).insights.export;

const filterOf = (i: In): Filter => ({
  contact: { ownerId: s(i.owner_id), stage: s(i.stage), q: s(i.q) },
  contactId: s(i.contact_id),
  kind: s(i.kind),
  state: s(i.state),
  oppStage: s(i.opp_stage),
  archived: typeof i.archived === 'boolean' ? i.archived : undefined,
});

/** Khách trong phạm vi + bộ lọc khách; `contact_id` lạ → không dòng nào (không lộ tồn tại). */
function byContact(a: AuthzContext, f: Filter) {
  const base = contactWhereSql(a, f.contact);
  if (!f.contactId) return base;
  return UUID.test(f.contactId) ? Prisma.sql`${base} AND c.id = ${f.contactId}::uuid` : Prisma.sql`FALSE`;
}

const ordered = <T extends { id: string }>(xs: string[], rows: T[]) => {
  const at = new Map(xs.map((id, i) => [id, i]));
  return rows.sort((x, y) => at.get(x.id)! - at.get(y.id)!);
};

/** Khách còn thấy được (scope HIỆN TẠI) → mã + tên, theo id khách của lô. */
async function liveContacts(tx: ExportDb, a: AuthzContext, ids: string[]) {
  if (!ids.length) return new Map<string, { code: string | null; name: string }>();
  const rows = await tx.$queryRaw<{ id: string; code: string | null; name: string }[]>`
    SELECT c.id, c.code, c.name FROM contact c
    WHERE c.id IN (${idList([...new Set(ids)])}) AND c.deleted_at IS NULL AND ${crmScopeSql(a)}`;
  return new Map(rows.map((r) => [r.id, { code: r.code, name: r.name }]));
}

const head = (m: ExportLabels): ExportColumn[] => [
  { key: 'id', header: m.col.recordId, width: 38 },
  { key: 'contactCode', header: m.col.contactCode, width: 14 },
  { key: 'contact', header: m.col.contact, width: 24 },
];

/** Phần chung: chốt id (bước 1 của deferred join — chỉ id, index theo khách + sort của tập). */
function base(kind: ListExportKind, table: Table, cond: (f: Filter) => Prisma.Sql, order: Prisma.Sql) {
  return {
    kind,
    entity: null,
    filter: filterOf,
    async snapshot(tx: ExportDb, a: AuthzContext, f: Filter, cap: number) {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT x.id FROM ${Prisma.raw(table)} x JOIN contact c ON c.id = x.contact_id
        WHERE ${byContact(a, f)} AND ${cond(f)} ORDER BY ${order} LIMIT ${cap}`;
      return rows.map((r) => r.id);
    },
  };
}

const NOTE_KINDS = new Set(['note', 'comment']);
const TASK_STATES = new Set(['open', 'done', 'cancelled']);
const OPP_STAGES = new Set<string>(OPPORTUNITY_STAGES);

export const contactNoteReader: ListReader<Filter> = {
  ...base(
    'contact_note.export',
    'contact_note',
    (f) =>
      f.kind && NOTE_KINDS.has(f.kind)
        ? Prisma.sql`x.deleted_at IS NULL AND x.kind = ${f.kind}::contact_note_kind`
        : Prisma.sql`x.deleted_at IS NULL`,
    Prisma.sql`x.contact_id, x.created_at DESC, x.id DESC`,
  ),
  columns: (m) => [
    ...head(m),
    { key: 'kind', header: m.col.noteKind },
    { key: 'body', header: m.col.body, width: 60 },
    { key: 'author', header: m.col.author, width: 20 },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx, a, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const list = await tx.contactNote.findMany({ where: { id: { in: xs }, deletedAt: null } });
    const live = await liveContacts(tx, a, list.map((n) => n.contactId));
    const kept = ordered(xs, list.filter((n) => live.has(n.contactId)));
    const names = await place.names(kept.map((n) => n.authorUserId));
    const m = labelsOf(place);
    return {
      ids: kept.map((n) => n.id),
      rows: kept.map((n): Cell[] => {
        const c = live.get(n.contactId)!;
        return [n.id, c.code, c.name, m.noteKind[n.kind], n.body, names.get(n.authorUserId ?? '') ?? '', stamp(n.createdAt, place.timeZone)];
      }),
    };
  },
};

export const contactTaskReader: ListReader<Filter> = {
  ...base(
    'contact_task.export',
    'contact_task',
    (f) => (f.state && TASK_STATES.has(f.state) ? Prisma.sql`x.state = ${f.state}::contact_task_state` : Prisma.sql`TRUE`),
    Prisma.sql`x.contact_id, x.due_at ASC NULLS LAST, x.id`,
  ),
  columns: (m) => [
    ...head(m),
    { key: 'title', header: m.col.title, width: 32 },
    { key: 'description', header: m.col.body, width: 40 },
    { key: 'due', header: m.col.due },
    { key: 'state', header: m.col.status },
    { key: 'assignee', header: m.col.assignee, width: 20 },
    { key: 'completedAt', header: m.col.completedAt },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx, a, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const list = await tx.contactTask.findMany({ where: { id: { in: xs } } });
    const live = await liveContacts(tx, a, list.map((t) => t.contactId));
    const kept = ordered(xs, list.filter((t) => live.has(t.contactId)));
    const names = await place.names(kept.map((t) => t.assigneeUserId));
    const m = labelsOf(place);
    return {
      ids: kept.map((t) => t.id),
      rows: kept.map((t): Cell[] => {
        const c = live.get(t.contactId)!;
        return [
          t.id,
          c.code,
          c.name,
          t.title,
          t.description,
          stamp(t.dueAt, place.timeZone),
          m.taskState[t.state],
          names.get(t.assigneeUserId ?? '') ?? '',
          stamp(t.completedAt, place.timeZone),
          stamp(t.createdAt, place.timeZone),
        ];
      }),
    };
  },
};

/** Cột tiền chỉ khi người xuất đọc được tiền báo giá — bản không quyền không có cột (không lộ qua tệp / model). */
const oppColumns = (m: ExportLabels, withMoney: boolean): ExportColumn[] => [
  ...head(m),
  { key: 'title', header: m.col.title, width: 32 },
  { key: 'need', header: m.col.need, width: 40 },
  ...(withMoney ? [{ key: 'expectedAmount', header: m.col.expectedAmount, width: 22 }] : []),
  { key: 'stage', header: m.col.status },
  // TIP-026c: xác suất cố định theo giai đoạn (bảng hằng), không phải số người nhập.
  { key: 'probability', header: m.col.probability },
  { key: 'owner', header: m.col.assignee, width: 20 },
  { key: 'source', header: m.col.source },
  { key: 'expectedClose', header: m.col.expectedClose },
  { key: 'archived', header: m.col.archived },
  { key: 'updatedAt', header: m.col.updatedAt },
];

export const contactOpportunityReader: ListReader<Filter> = {
  ...base(
    'contact_opportunity.export',
    'contact_opportunity',
    (f) => {
      const arch = f.archived ? Prisma.sql`x.archived_at IS NOT NULL` : Prisma.sql`x.archived_at IS NULL`;
      return f.oppStage && OPP_STAGES.has(f.oppStage)
        ? Prisma.sql`${arch} AND x.stage = ${f.oppStage}::contact_opportunity_stage`
        : arch;
    },
    Prisma.sql`x.contact_id, x.updated_at DESC, x.id DESC`,
  ),
  columns: (m, a) => oppColumns(m, !!a && canReadAmount(a)),
  async rows(tx, a, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const list = await tx.contactOpportunity.findMany({ where: { id: { in: xs } } });
    const live = await liveContacts(tx, a, list.map((o) => o.contactId));
    const kept = ordered(xs, list.filter((o) => live.has(o.contactId)));
    const withMoney = canReadAmount(a);
    const m = labelsOf(place);
    const names = await place.names(kept.map((o) => o.ownerUserId));
    const src = serverMessages(place.locale).crm.opportunity.source;
    return {
      ids: kept.map((o) => o.id),
      rows: kept.map((o): Cell[] => {
        const c = live.get(o.contactId)!;
        return [
          o.id,
          c.code,
          c.name,
          o.title,
          o.need,
          ...(withMoney ? [money(o.amountVnd)] : []),
          m.oppStage[o.stage],
          String(OPPORTUNITY_PROBABILITY[o.stage]),
          names.get(o.ownerUserId ?? '') ?? '',
          src[o.sourceKind as keyof typeof src] ?? o.sourceKind,
          day(o.expectedCloseDate),
          o.archivedAt ? m.yes : null,
          stamp(o.updatedAt, place.timeZone),
        ];
      }),
    };
  },
};
