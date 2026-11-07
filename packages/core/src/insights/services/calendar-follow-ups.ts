// Việc follow ở Lịch hẹn (TIP-038 pha 2, AC05): cùng bảng + cùng scope với dashboard — việc tới hạn trước hết hôm nay (giờ workspace), ≤ 20.
// Hoàn tất ở lịch / dashboard đều là `follow_up.complete` trên cùng id (không còn id mẫu `cfu_*`).
import { can, utcToWall, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { insightAuthz } from '../metrics/common';
import { visibleFollowUps } from './follow-ups';

type Row = { id: string; at: string; note: string; contact_name: string; step: string; owner: string; channel: string; due: 'today' | 'overdue' };

export async function calendarFollowUps(tx: TenantTx, authz: AuthzContext, now: Date, timeZone: string, endOfToday: Date): Promise<Row[]> {
  if (!can(authz, 'crm.view')) return [];
  const { rows } = await visibleFollowUps(tx, insightAuthz(authz), 20, endOfToday);
  const today = utcToWall(now, timeZone).date;
  const names = new Map(
    (await tx.staff.findMany({ where: { userId: { in: rows.map((r) => r.owner_user_id).filter((x): x is string => !!x) } }, select: { userId: true, name: true } })).map((s) => [s.userId, s.name]),
  );
  return rows.map((r) => ({
    id: r.id,
    at: utcToWall(r.due_at, timeZone).iso,
    note: r.name,
    contact_name: r.name,
    step: r.stage,
    owner: (r.owner_user_id && names.get(r.owner_user_id)) || 'agent',
    channel: r.last_channel === 'zalo_personal' || r.last_channel === 'email' || r.last_channel === 'webchat' ? r.last_channel : 'staff',
    due: utcToWall(r.due_at, timeZone).date < today ? 'overdue' : 'today',
  }));
}
