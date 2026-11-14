// Đọc cấu hình lịch hẹn (TIP-033b §3.6): metadata (giờ mở cửa 7 thứ, bước lưới, đệm, no-show, version) một lần + trang nhân sự theo
// (active DESC, sort, id) — chọn id trước bằng index `staff_page_idx`, rồi mới nạp payload + ca riêng cho đúng trang (deferred join).
// Ca riêng trung thực tri-state (thứ vắng = theo giờ mở cửa, open=false = nghỉ). Cursor mờ = "active|sort|id". Dùng chung GET
// /settings/booking và action `booking.settings_get` (quyền booking.config kiểm ở cửa vào).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { bookingSetting } from '../services/slots';

export const STAFF_LIMIT = 30;
export const STAFF_MAX = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const initial = (name: string) => name.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? '';
const enc = (k: { active: boolean; sort: number; id: string }) => Buffer.from(`${k.active ? 1 : 0}|${k.sort}|${k.id}`).toString('base64url');

function dec(cursor: string): { active: boolean; sort: number; id: string } {
  const [a, s, id] = Buffer.from(cursor, 'base64url').toString().split('|');
  if ((a !== '0' && a !== '1') || !/^-?\d+$/.test(s ?? '') || !UUID.test(id ?? '')) throw new AppError('VALIDATION_FAILED', 422, { staff_cursor: 'invalid' });
  return { active: a === '1', sort: Number(s), id: id! };
}

export interface SettingsPage {
  cursor?: string;
  limit?: number;
}

export async function readBookingSettings(tx: TenantTx, page: SettingsPage = {}) {
  const limit = Math.min(Math.max(page.limit ?? STAFF_LIMIT, 1), STAFF_MAX);
  const after = page.cursor ? dec(page.cursor) : null;
  // (active DESC, sort ASC, id ASC): sau con trỏ = active nhỏ hơn, hoặc cùng active mà (sort, id) lớn hơn.
  const seek = after
    ? Prisma.sql`WHERE (active < ${after.active} OR (active = ${after.active} AND (sort, id) > (${after.sort}, ${after.id}::uuid)))`
    : Prisma.empty;
  const keys = await tx.$queryRaw<{ id: string; active: boolean; sort: number }[]>`
    SELECT id, active, sort FROM staff ${seek} ORDER BY active DESC, sort ASC, id ASC LIMIT ${limit + 1}`;
  const more = keys.length > limit;
  const pageKeys = keys.slice(0, limit);
  const [setting, hours, rows] = await Promise.all([
    bookingSetting(tx),
    tx.businessHours.findMany({ orderBy: { weekday: 'asc' } }),
    pageKeys.length ? tx.staff.findMany({ where: { id: { in: pageKeys.map((k) => k.id) } }, include: { schedules: { orderBy: { weekday: 'asc' } } } }) : Promise.resolve([]),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return {
    days: hours.map((h) => ({ weekday: h.weekday, open: h.open, start: h.startTime, end: h.endTime })),
    slot_step_min: setting.slotStepMin,
    default_buffer_min: setting.defaultBufferMin,
    no_show_deducts: setting.noShowDeducts,
    version: setting.version,
    staff: pageKeys.flatMap((k) => {
      const s = byId.get(k.id);
      return s
        ? [{
            id: s.id,
            name: s.name,
            role: s.role,
            initial: initial(s.name),
            color: s.color,
            team: s.team,
            room: s.room,
            active: s.active,
            skills: s.skills,
            user_id: s.userId,
            schedule: s.schedules.map((x) => ({ weekday: x.weekday, open: x.open, start: x.startTime, end: x.endTime })),
            version: s.version,
          }]
        : [];
    }),
    staff_next_cursor: more ? enc(pageKeys.at(-1)!) : null,
  };
}
