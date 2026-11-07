// "Việc cần tôi" (TIP-038 mục 3, AC04) — một selector cho dashboard (MyWork) và bản tin sáng; mỗi nguồn kiểm quyền module + data scope của
// chính domain (helper 042c) — không đếm toàn tenant rồi che UI:
//   approval            — yêu cầu duyệt còn hạn mà người xem QUYẾT ĐỊNH được (approvals.decide ∧ permission của action gốc).
//   handoff             — hội thoại AI chuyển người, chưa đóng (inbox.view, convScopeSql).
//   ticket_overdue      — ticket chưa đóng đã vi phạm SLA (ticket.view, supportScopeSql).
//   appointment_overdue — lịch chờ / đã xác nhận mà giờ bắt đầu đã qua (booking.view, bookingScopeSql).
//   contract_renewal    — hợp đồng đã ký còn ≤ 30 ngày tới ngày kết thúc (contract.view, contractScopeSql) — đọc trực tiếp end_date (không
//                          phụ thuộc event `contract.expiring` bị dọn); xoá / hết hạn / đổi ngày → tự hết hiệu lực. CTA mở Trợ lý soạn đề
//                          xuất gia hạn — không tự gửi, không tự gia hạn.
// Mốc thời gian tính ở JS rồi truyền tham số (Q-053). Mỗi nguồn ≤ PER_SOURCE dòng, tổng ≤ 20.
import { can, interpolate, isPermissionKey, serverMessages, utcToWall, type AuthzContext, type WorkItemDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { bookingScopeSql } from '../../booking/booking-access';
import { convScopeSql } from '../../inbox/services/access';
import { supportScopeSql } from '../../support/ticket-access';
import { insightAuthz } from '../metrics/common';
import { renewalItems } from './renewal-suggestions';

const PER_SOURCE = 5;
type Tx = Pick<TenantTx, '$queryRaw' | 'approvalRequest'>;
interface Place { timeZone: string; locale: string }

const seen = (a: AuthzContext, perm: Parameters<typeof can>[1], mod: keyof AuthzContext['scope']) => can(a, perm) && (a.isOwner || a.scope[mod] !== 'none');

/** `perSource` — trần mỗi nguồn (dashboard 5; bản tin đếm với trần lớn hơn). */
export async function workItems(tx: Tx, authz0: AuthzContext, now: Date, place: Place, perSource = PER_SOURCE): Promise<WorkItemDto[]> {
  const a = insightAuthz(authz0);
  const m = serverMessages(place.locale).insights.work;
  const hm = (d: Date) => utcToWall(d, place.timeZone);
  const out: WorkItemDto[] = [];

  if (can(a, 'approvals.decide')) {
    const rows = await tx.approvalRequest.findMany({ where: { status: 'pending', expiresAt: { gt: now } }, orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], take: perSource * 4, select: { id: true, title: true, permission: true, expiresAt: true } });
    for (const r of rows.filter((r) => !isPermissionKey(r.permission) || can(a, r.permission)).slice(0, perSource))
      out.push({ id: r.id, type: 'approval', title: r.title, sub: m.approval, due_at: r.expiresAt.toISOString(), route: '/assistant/approvals' });
  }
  if (seen(a, 'inbox.view', 'inbox')) {
    const rows = await tx.$queryRaw<{ id: string; title: string | null; name: string | null; at: Date }[]>`
      SELECT cv.id, cv.title, c.name, cv.last_message_at AS at FROM conversation cv LEFT JOIN contact c ON c.id = cv.contact_id
      WHERE cv.ai_state = 'handoff' AND cv.status <> 'closed' AND cv.archived_at IS NULL AND ${convScopeSql(a)}
      ORDER BY cv.last_message_at, cv.id LIMIT ${perSource}`;
    for (const r of rows) out.push({ id: r.id, type: 'handoff', title: r.name ?? r.title ?? m.unknownContact, sub: m.handoff, due_at: r.at.toISOString(), route: `/inbox?c=${r.id}` });
  }
  if (seen(a, 'ticket.view', 'support')) {
    const rows = await tx.$queryRaw<{ id: string; code: string; title: string; at: Date }[]>`
      SELECT t.id, t.code, t.title, t.ttr_due_at AS at FROM ticket t
      WHERE t.status <> 'closed' AND t.breached_at IS NOT NULL AND ${supportScopeSql(a)} ORDER BY t.ttr_due_at, t.id LIMIT ${perSource}`;
    for (const r of rows) out.push({ id: r.id, type: 'ticket_overdue', title: `${r.code} · ${r.title}`, sub: m.ticket, due_at: r.at.toISOString(), route: `/tickets?open=${r.id}` });
  }
  if (seen(a, 'booking.view', 'booking')) {
    const rows = await tx.$queryRaw<{ id: string; code: string; name: string; at: Date }[]>`
      SELECT a.id, a.code, c.name, a.start_at AS at FROM appointment a JOIN contact c ON c.id = a.contact_id
      WHERE a.deleted_at IS NULL AND a.status IN ('pending', 'confirmed') AND a.start_at < ${now} AND ${bookingScopeSql(a)}
      ORDER BY a.start_at, a.id LIMIT ${perSource}`;
    for (const r of rows) {
      const w = hm(r.at);
      out.push({ id: r.id, type: 'appointment_overdue', title: `${r.code} · ${r.name}`, sub: interpolate(m.appointment, { time: w.hm, date: w.date.split('-').reverse().join('/') }), due_at: r.at.toISOString(), route: `/calendar` });
    }
  }
  if (seen(a, 'contract.view', 'sales')) out.push(...(await renewalItems(tx, a, now, place, perSource)));
  return perSource === PER_SOURCE ? out.slice(0, 20) : out;
}

/** Đếm cho bản tin sáng (cùng selector, cùng scope — không còn coi team như all). */
export function countByType(items: WorkItemDto[]): Record<WorkItemDto['type'], number> {
  const c = { approval: 0, handoff: 0, ticket_overdue: 0, appointment_overdue: 0, contract_renewal: 0 };
  for (const i of items) c[i.type]++;
  return c;
}
