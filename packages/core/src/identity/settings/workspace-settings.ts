// `workspace.settings` jsonb (Blueprint §2.2 "giờ mở cửa, ngưỡng mặc định") — các khoá TIP-013 ghi / đọc ở một chỗ:
// `general` (website, support_phone, admin_email, date_format — Cài đặt › Tổng quan / Ngôn ngữ), `working_hours` (giờ làm việc
// người + tạm dừng SLA ngoài giờ). Khoá khác (`auto_named`, `onboarding_steps`) do TIP-011 sở hữu — đọc-sửa-ghi giữ nguyên.
import { DEFAULT_WORKING_DAYS, type WorkingDay } from '@appchat/shared';
import type { PlatformTx } from '../../kernel/actions/action-context';

export interface GeneralSettings {
  website?: string;
  support_phone?: string;
  admin_email?: string;
  date_format?: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
}

export interface WorkingHours {
  days: WorkingDay[];
  pause_sla: boolean;
}

export type SettingsBag = Record<string, unknown> & { general?: GeneralSettings; working_hours?: WorkingHours };

export const generalOf = (s: unknown): GeneralSettings => ((s ?? {}) as SettingsBag).general ?? {};

export const workingHoursOf = (s: unknown): WorkingHours =>
  ((s ?? {}) as SettingsBag).working_hours ?? { days: DEFAULT_WORKING_DAYS.map((d) => ({ ...d })), pause_sla: true };

/** Khoá dòng workspace rồi đọc settings — hai lần lưu song song không ghi đè nhau (đọc-sửa-ghi jsonb). */
export async function lockSettings(ptx: PlatformTx, workspaceId: string): Promise<SettingsBag> {
  await ptx.$queryRaw`SELECT id FROM workspace WHERE id = ${workspaceId}::uuid FOR UPDATE`;
  const w = await ptx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { settings: true } });
  return { ...((w.settings ?? {}) as SettingsBag) };
}
