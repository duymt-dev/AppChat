// Đồng hồ SLA (REQ-H03, Blueprint §2.2 sla_policy / ticket): chính sách mặc định (seed lúc tạo DB tenant, tự bù cho workspace cũ), lịch
// giờ làm việc của workspace (DB nền tảng `workspace.settings.working_hours` — DC-049) + múi giờ. Hạn người = phút làm việc (tắt "tạm dừng
// SLA ngoài giờ" → tuyệt đối), hạn AI = tuyệt đối. Thiếu DB nền tảng (test đơn vị) → lịch mặc định, giờ VN.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DEFAULT_WORKING_DAYS, SLA_DEFAULT, addBusinessMinutes, businessMinutesBetween, type BusinessCalendar } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { workingHoursOf } from '../../identity/public';

export type SlaPolicyRecord = NonNullable<Awaited<ReturnType<TenantTx['slaPolicy']['findFirst']>>>;
type Db = Pick<TenantTx, 'slaPolicy'>;

/** Id cố định của chính sách mặc định — seed + tự bù idempotent. */
export const DEFAULT_SLA_POLICY_ID = '00000000-0000-7000-8000-000000000034';
export const DEFAULT_ESCALATION = Object.fromEntries(SLA_DEFAULT.escalation.map((e) => [e.key, e.on])) as Record<string, boolean>;

/** Chính sách mặc định — chưa có (workspace tạo trước TIP-034) thì tạo từ SLA_DEFAULT. */
export async function defaultPolicy(tx: Db, now: Date): Promise<SlaPolicyRecord> {
  const p = await tx.slaPolicy.findFirst({ where: { isDefault: true } });
  if (p) return p;
  return tx.slaPolicy.upsert({
    where: { id: DEFAULT_SLA_POLICY_ID },
    update: {},
    create: {
      id: DEFAULT_SLA_POLICY_ID,
      name: SLA_DEFAULT.name,
      isDefault: true,
      frtAiMin: SLA_DEFAULT.frt_ai,
      frtHumanMin: SLA_DEFAULT.frt_human,
      ttrAiMin: SLA_DEFAULT.ttr_ai,
      ttrHumanMin: SLA_DEFAULT.ttr_human,
      escalation: DEFAULT_ESCALATION,
      createdAt: now,
      updatedAt: now,
    },
  });
}

export const escalationOf = (p: SlaPolicyRecord): Record<string, boolean> => ({ ...DEFAULT_ESCALATION, ...((p.escalation ?? {}) as Record<string, boolean>) });

@Injectable()
export class SlaCalendar {
  constructor(@Optional() @Inject(PLATFORM_DB) private readonly platform?: PlatformDb) {}

  async of(ws: string): Promise<BusinessCalendar & { locale: string }> {
    const w = this.platform ? await this.platform.workspace.findUnique({ where: { id: ws }, select: { settings: true, timezone: true, locale: true } }) : null;
    const wh = w ? workingHoursOf(w.settings) : { days: DEFAULT_WORKING_DAYS.map((d) => ({ ...d })), pause_sla: true };
    return { days: wh.days, enabled: wh.pause_sla, timeZone: w?.timezone ?? 'Asia/Ho_Chi_Minh', locale: w?.locale ?? 'vi' };
  }
}

/** Mục tiêu + hạn khi tạo / mở lại: người phụ trách là agent → hạn AI (0 = dùng hạn người — agent trả lời ngay nhưng vẫn cần hạn xử lý). */
export function targetsFor(p: SlaPolicyRecord, ai: boolean, start: Date, cal: BusinessCalendar) {
  const frt = ai && p.frtAiMin > 0 ? p.frtAiMin : p.frtHumanMin;
  const ttr = ai && p.ttrAiMin > 0 ? p.ttrAiMin : p.ttrHumanMin;
  const due = (min: number, human: boolean) => (human ? addBusinessMinutes(start, min, cal) : new Date(start.getTime() + min * 60_000));
  const human = !(ai && p.ttrAiMin > 0);
  return { frtTargetMin: frt, ttrTargetMin: ttr, frtDueAt: due(frt, !(ai && p.frtAiMin > 0)), ttrDueAt: due(ttr, human), ttrStartAt: start };
}

/** Rời "Đang chờ": cộng thời gian dừng (phút làm việc nếu hạn tính theo giờ làm) vào hạn TTR. */
export function resumeDue(t: { ttrDueAt: Date; pausedSince: Date | null; pausedTotalSec: number }, now: Date, cal: BusinessCalendar) {
  if (!t.pausedSince) return { ttrDueAt: t.ttrDueAt, pausedTotalSec: t.pausedTotalSec };
  const mins = businessMinutesBetween(t.pausedSince, now, cal);
  return { ttrDueAt: addBusinessMinutes(t.ttrDueAt, mins, cal), pausedTotalSec: t.pausedTotalSec + Math.max(0, Math.round((now.getTime() - t.pausedSince.getTime()) / 1000)) };
}
