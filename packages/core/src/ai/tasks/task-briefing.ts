// Bản tin sáng "việc cần tôi" (REQ-E08, Blueprint §5.4 — 08:00 cho Owner, gửi vào Trợ lý + thông báo): hàng chờ duyệt, hội thoại cần
// người, lịch hôm nay (giờ workspace), ticket quá hạn SLA, credit sắp hết. Tổng hợp bằng truy vấn (không qua model — không tốn credit),
// đếm theo data scope của người nhận qua selector "Việc cần tôi" dùng chung với Tổng quan (TIP-038). Mỗi dòng có lối tắt mở đúng màn.
import type { TenantDb } from '@appchat/db';
import { bookingScopeSql } from '../../booking/booking-access';
import { countByType, workItems } from '../../insights/services/work-items';
import { interpolate, serverMessages, utcToWall, wallToUtc, type AuthzContext } from '@appchat/shared';

export interface Briefing {
  title: string;
  lines: { text: string; route: string }[];
  summary: string;
  counts: { approvals: number; conversations: number; appointments: number; tickets: number; credits: number | null };
}

const LOW_CREDITS = 100;

export async function buildBriefing(db: TenantDb, authz: AuthzContext, now: Date, place: { timeZone: string; locale: string }, credits: number | null): Promise<Briefing> {
  const m = serverMessages(place.locale).tasks.briefing;
  const today = utcToWall(now, place.timeZone).date;
  const from = wallToUtc(today, '00:00', place.timeZone);
  const to = new Date(from.getTime() + 86_400_000);
  const booking = authz.isOwner ? 'all' : authz.scope.booking;
  // Hàng chờ duyệt / hội thoại cần người / ticket quá hạn: cùng selector "Việc cần tôi" của Tổng quan (TIP-038 — scope 042c thật, team không
  // còn coi như all). Lịch hôm nay vẫn đếm riêng (lịch sắp tới, không phải việc quá hạn).
  const [work, appts] = await Promise.all([
    workCounts(db, authz, now, place),
    booking === 'none'
      ? Promise.resolve([] as { at: Date; name: string }[])
      : db.$queryRaw<{ at: Date; name: string }[]>`
          SELECT a.start_at AS at, c.name FROM appointment a JOIN contact c ON c.id = a.contact_id
          WHERE a.deleted_at IS NULL AND a.status IN ('pending', 'confirmed') AND a.start_at >= ${from} AND a.start_at < ${to}
            AND ${bookingScopeSql(authz)}
          ORDER BY a.start_at`,
  ]);
  const { approval: approvals, handoff: conversations, ticket_overdue: tickets } = work;
  const lines: Briefing['lines'] = [];
  if (approvals) lines.push({ text: interpolate(m.approvals, { n: approvals }), route: '/assistant/approvals' });
  if (conversations) lines.push({ text: interpolate(m.conversations, { n: conversations }), route: '/inbox' });
  if (appts.length) {
    const first = appts[0]!;
    lines.push({ text: `${interpolate(m.appointments, { n: appts.length })} · ${interpolate(m.firstAppt, { time: utcToWall(first.at, place.timeZone).hm, name: first.name })}`, route: '/calendar' });
  }
  if (tickets) lines.push({ text: interpolate(m.tickets, { n: tickets }), route: '/tickets' });
  if (credits !== null && credits <= LOW_CREDITS) lines.push({ text: interpolate(m.creditsLow, { n: credits }), route: '/settings/wallet' });
  const counts = { approvals, conversations, appointments: appts.length, tickets, credits };
  return {
    title: interpolate(m.title, { date: today.split('-').reverse().join('/') }),
    lines,
    summary: lines.length ? interpolate(m.summary, { approvals, conversations, appointments: appts.length, tickets }) : m.clear,
    counts,
  };
}

/** Đếm theo loại từ selector dùng chung (trần BRIEF_CAP mỗi nguồn — bản tin là tóm tắt, không phải danh sách đầy đủ). */
const BRIEF_CAP = 500;
async function workCounts(db: TenantDb, authz: AuthzContext, now: Date, place: { timeZone: string; locale: string }) {
  return db.$transaction((tx) => workItems(tx, authz, now, place, BRIEF_CAP).then(countByType));
}
