// Xuất lịch sử một khách ra CSV (TIP-025b §D.6) — chỉ xuất, cùng quyền đọc với Hồ sơ 360° (thấy khách) + `crm.export`. Tập id CHỐT lúc
// nhận lệnh theo bộ lọc ngày (múi giờ workspace, gồm hai đầu) / loại / thứ tự, keyset `(contact_id, occurred_at, id)` trên index
// `timeline_event_contact_id_occurred_at_id_idx`; dòng dựng theo lô (deferred join PK). Nội dung = câu đã dựng từ khoá + tham số như
// 360 (không xuất JSON thô); sự kiện cũ không có khoá mẫu → giữ dòng nhưng bỏ nội dung, đếm vào `excluded` (không đoán che chuỗi).
// Ô bắt đầu = + - @ chặn công thức, BOM UTF-8.
import { TenantSql as Prisma } from '@appchat/db';
import { TIMELINE_EXPORT_COLUMNS, createFmt, serverMessages, wallToUtc, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { csvCell } from './contact-export';
import type { CrmMembers } from './members.service';
import { renderTimeline } from './timeline.service';
import { inFamilySql } from '../lifecycle/family-sql';
import { familyIds } from '../lifecycle/lock';

export const TIMELINE_COLUMNS = TIMELINE_EXPORT_COLUMNS;
export type TimelineColumn = (typeof TIMELINE_COLUMNS)[number];

export interface TimelineExportFilter {
  contactId: string;
  from?: string;
  to?: string;
  types?: string[];
  order?: 'newest' | 'oldest';
}

const BOM = '﻿';
const DAY_MS = 86_400_000;

type Db = Pick<TenantTx, '$queryRaw' | 'timelineEvent' | 'quote' | 'order' | 'contract' | 'invoice' | 'ticket' | 'appointment'>;

/** Toàn bộ id sự kiện khớp bộ lọc theo thứ tự xuất (chỉ id — index-only trên index khách + thời điểm). */
export async function snapshotTimelineIds(db: Pick<TenantTx, '$queryRaw'>, f: TimelineExportFilter, timeZone: string): Promise<string[]> {
  const conds = [inFamilySql('t.contact_id', f.contactId)];
  if (f.from) conds.push(Prisma.sql`t.occurred_at >= ${wallToUtc(f.from, '00:00', timeZone)}`);
  if (f.to) conds.push(Prisma.sql`t.occurred_at < ${new Date(wallToUtc(f.to, '00:00', timeZone).getTime() + DAY_MS)}`);
  if (f.types?.length) conds.push(Prisma.sql`t.type::text IN (${Prisma.join(f.types)})`);
  const dir = f.order === 'oldest' ? Prisma.raw('ASC') : Prisma.raw('DESC');
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT t.id FROM timeline_event t WHERE ${Prisma.join(conds, ' AND ')} ORDER BY t.occurred_at ${dir}, t.id ${dir}`;
  return rows.map((r) => r.id);
}

export function timelineHead(cols: readonly TimelineColumn[], locale: string, timeZone: string): string {
  const m = serverMessages(locale).crm.timelineExport.cols;
  return BOM + cols.map((c) => csvCell(c === 'at' ? m.at.replace('{tz}', timeZone) : m[c])).join(',');
}

/** Mã chứng từ của các sự kiện có tham chiếu (một truy vấn mỗi loại, không theo từng dòng). */
async function refCodes(db: Db, rows: { refType: string | null; refId: string | null }[]): Promise<Map<string, string>> {
  const by = new Map<string, string[]>();
  for (const r of rows) if (r.refType && r.refId) by.set(r.refType, [...(by.get(r.refType) ?? []), r.refId]);
  const out = new Map<string, string>();
  const pick = async (type: string, find: (ids: string[]) => Promise<{ id: string; code: string }[]>) => {
    const ids = by.get(type);
    if (ids?.length) for (const x of await find(ids)) out.set(`${type}:${x.id}`, x.code);
  };
  const sel = { id: true, code: true } as const;
  await Promise.all([
    pick('quote', (ids) => db.quote.findMany({ where: { id: { in: ids } }, select: sel })),
    pick('order', (ids) => db.order.findMany({ where: { id: { in: ids } }, select: sel })),
    pick('contract', (ids) => db.contract.findMany({ where: { id: { in: ids } }, select: sel })),
    pick('invoice', (ids) => db.invoice.findMany({ where: { id: { in: ids } }, select: sel })),
    pick('ticket', (ids) => db.ticket.findMany({ where: { id: { in: ids } }, select: sel })),
    pick('appointment', (ids) => db.appointment.findMany({ where: { id: { in: ids } }, select: sel })),
  ]);
  return out;
}

/**
 * Dòng CSV của một lô id (giữ thứ tự). `contactId` khoá lại khách — id không thuộc khách này bỏ (không lộ sự kiện khách khác).
 * `withheld` = số dòng giữ lại nhưng bỏ nội dung (sự kiện cũ không có khoá mẫu).
 */
export async function timelineLines(
  db: Db,
  contactId: string,
  ids: string[],
  o: { cols: readonly TimelineColumn[]; locale: string; timeZone: string; members: Pick<CrmMembers, 'names'> },
): Promise<{ lines: string[]; ids: string[]; withheld: number }> {
  if (!ids.length) return { lines: [], ids: [], withheld: 0 };
  const rows = await db.timelineEvent.findMany({ where: { id: { in: ids }, contactId: { in: await familyIds(db, contactId) } }, select: { id: true, type: true, summary: true, payload: true, occurredAt: true, refType: true, refId: true, actorType: true, actorId: true } });
  const order = new Map(ids.map((id, i) => [id, i]));
  rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  const m = serverMessages(o.locale).crm;
  const fmt = createFmt({ locale: o.locale, timeZone: o.timeZone });
  const rendered = new Map(renderTimeline(rows, o.locale, o.timeZone).map((r) => [r.id, r.text]));
  const [codes, names] = await Promise.all([refCodes(db, rows), o.members.names(rows.filter((r) => r.actorType === 'user').map((r) => r.actorId))]);
  let withheld = 0;
  const lines = rows.map((r) => {
    const key = (r.payload as { key?: string } | null)?.key;
    const known = !!key && key in m.timeline;
    if (!known) withheld += 1;
    const actor = r.actorType === 'user' ? (r.actorId ? (names.get(r.actorId) ?? '') : '') : (m.timelineExport.actor[r.actorType as keyof typeof m.timelineExport.actor] ?? '');
    const cell: Record<TimelineColumn, string> = {
      at: `${fmt.date(r.occurredAt)} ${fmt.time(r.occurredAt)}`,
      type: m.timelineExport.types[r.type as keyof typeof m.timelineExport.types] ?? r.type,
      text: known ? (rendered.get(r.id) ?? '') : '',
      ref: r.refType && r.refId ? (codes.get(`${r.refType}:${r.refId}`) ?? '') : '',
      actor,
    };
    return o.cols.map((c) => csvCell(cell[c])).join(',');
  });
  return { lines, ids: rows.map((r) => r.id), withheld };
}

export const timelineFileName = (code: string, locale: string, now: Date) =>
  serverMessages(locale).crm.timelineExport.file.replace('{code}', code).replace('{date}', now.toISOString().slice(0, 10));

/** Dấu quyền tệp lịch sử: vẫn thấy khách + còn `crm.export` được kiểm ở route tải; scope crm đổi → tệp cũ không tải nữa. */
export const timelineStamp = (a: AuthzContext) => `${a.isOwner ? 'all' : (a.scope.crm ?? 'none')}|${[...a.teamIds].sort().join(',')}`;
