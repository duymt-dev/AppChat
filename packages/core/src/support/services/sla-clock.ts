// Đồng hồ SLA (REQ-H03, Blueprint §2.2 sla_policy / ticket): chính sách mặc định (seed lúc tạo DB tenant, tự bù cho workspace cũ), lịch
// giờ làm việc của workspace (DB nền tảng `workspace.settings.working_hours` — DC-049) + múi giờ. Hạn người = phút làm việc (tắt "tạm dừng
// SLA ngoài giờ" → tuyệt đối), hạn AI = tuyệt đối. Thiếu DB nền tảng (test đơn vị) → lịch mặc định, giờ VN.
import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  DEFAULT_SLA_POLICY_ID,
  DEFAULT_WORKING_DAYS,
  SLA_DEFAULT,
  SLA_PRESETS,
  SOCIAL_SLA_POLICY_ID,
  VIP_SLA_POLICY_ID,
  addBusinessMinutes,
  businessMinutesBetween,
  type BusinessCalendar,
} from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { PLATFORM_DB } from '../../kernel/tenant/tenant.providers';
import { workingHoursOf } from '../../identity/public';

export type SlaPolicyRecord = NonNullable<Awaited<ReturnType<TenantTx['slaPolicy']['findFirst']>>>;
type Db = Pick<TenantTx, 'slaPolicy'>;

export { DEFAULT_SLA_POLICY_ID };
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

/** Đủ mọi gói SLA cài sẵn (Mặc định + VIP + Mạng xã hội) — idempotent, mỗi lần đọc chỉ 1 truy vấn khi đã đủ. */
export async function ensureSlaPolicies(tx: Db, now: Date): Promise<SlaPolicyRecord[]> {
  const existing = await tx.slaPolicy.findMany({ orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] });
  const byId = new Set(existing.map((p) => p.id));
  const hasDefault = existing.some((p) => p.isDefault);
  let added = false;
  for (const preset of SLA_PRESETS) {
    if (preset.isDefault && hasDefault) continue;
    if (byId.has(preset.id)) continue;
    await tx.slaPolicy.upsert({
      where: { id: preset.id },
      update: {},
      create: {
        id: preset.id,
        name: preset.name,
        isDefault: preset.isDefault,
        frtAiMin: preset.frt_ai,
        frtHumanMin: preset.frt_human,
        ttrAiMin: preset.ttr_ai,
        ttrHumanMin: preset.ttr_human,
        escalation: DEFAULT_ESCALATION,
        createdAt: now,
        updatedAt: now,
      },
    });
    added = true;
  }
  if (!added) return existing;
  return tx.slaPolicy.findMany({ orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }] });
}

/** Chọn chính sách áp cho tài khoản kênh (id / mã preset cũ / tên; kèm `sla_override` nếu có). */
export function resolveSlaPolicyFromList(
  policies: SlaPolicyRecord[],
  rawPolicy?: string | null,
  override?: { first_response_min: number; resolution_min?: number } | null,
): SlaPolicyRecord {
  const fallback = policies.find((p) => p.isDefault) ?? policies[0]!;
  const q = (rawPolicy ?? '').trim();
  const ql = q.toLowerCase();
  let base = fallback;
  if (q) {
    const exactId = policies.find((p) => p.id === q);
    if (exactId) base = exactId;
    else if (ql === 'vip' || ql === 'khách vip') base = policies.find((p) => p.id === VIP_SLA_POLICY_ID || p.name.toLowerCase().includes('vip')) ?? fallback;
    else if (ql === 'soc' || ql === 'social' || ql === 'mạng xã hội') {
      base = policies.find((p) => p.id === SOCIAL_SLA_POLICY_ID || p.name.toLowerCase().includes('xã hội') || p.name.toLowerCase().includes('social')) ?? fallback;
    } else if (ql !== 'std' && ql !== 'default' && ql !== 'mặc định') {
      base = policies.find((p) => p.name.toLowerCase() === ql) ?? fallback;
    }
  }
  if (override && override.first_response_min > 0) {
    return {
      ...base,
      frtHumanMin: override.first_response_min,
      ...(override.resolution_min && override.resolution_min > 0 ? { ttrHumanMin: override.resolution_min } : {}),
    };
  }
  return base;
}

export async function resolveAccountSlaPolicy(
  tx: Db,
  settings: { sla_policy?: string | null; sla_override?: { first_response_min: number; resolution_min?: number } | null } | null | undefined,
  now: Date,
): Promise<SlaPolicyRecord> {
  const policies = await ensureSlaPolicies(tx, now);
  return resolveSlaPolicyFromList(policies, settings?.sla_policy, settings?.sla_override);
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
