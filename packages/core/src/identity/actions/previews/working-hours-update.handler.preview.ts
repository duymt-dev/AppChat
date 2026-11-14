// Preview giờ làm việc (TIP-023b R2.8, risk config, DB nền tảng): các ngày đổi (bật / giờ) + tạm dừng SLA ngoài giờ trước / sau; trùng ngày
// / giờ ngược → 422 như execute. Chỉ đọc `workspace.settings` (không khoá dòng workspace).
import type { ActionInput, ActionPreview, workingHoursUpdate } from '@appchat/actions';
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { preview, updated, type Change } from '../../../kernel/actions/preview-kit';
import { workingHoursOf } from '../../settings/workspace-settings';

type Day = { day: number; on: boolean; from: string; to: string };
const fmt = (d: Day | undefined) => (d ? (d.on ? `${d.from}-${d.to}` : 'off') : null);

export async function workingHoursPreview(platform: Pick<PlatformDb, 'workspace'> | null, ws: string, i: ActionInput<typeof workingHoursUpdate>): Promise<ActionPreview> {
  const days = [...i.days].sort((a, b) => a.day - b.day);
  if (new Set(days.map((d) => d.day)).size !== 7) throw new AppError('VALIDATION_FAILED', 422, { days: 'duplicate_day' });
  const bad = days.find((d) => d.on && d.from >= d.to);
  if (bad) throw new AppError('VALIDATION_FAILED', 422, { [`days.${bad.day}`]: 'from_after_to' });
  const w = platform ? await platform.workspace.findUnique({ where: { id: ws }, select: { settings: true } }) : null;
  const cur = workingHoursOf(w?.settings);
  const byDay = new Map((cur.days as Day[]).map((d) => [d.day, d]));
  const changes: Change[] = days.flatMap((d) => (fmt(byDay.get(d.day)) === fmt(d) ? [] : [{ entity: 'working_hours', id: String(d.day), before: { hours: fmt(byDay.get(d.day)) }, after: { hours: fmt(d) } }]));
  changes.push(...updated('working_hours', 'pause_sla', { pause_sla: cur.pause_sla }, { pause_sla: i.pause_sla }));
  return preview('config', `${changes.length}`, { count: changes.length, changes });
}
