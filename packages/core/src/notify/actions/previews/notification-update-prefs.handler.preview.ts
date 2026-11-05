// Preview tuỳ chọn thông báo (TIP-023b R2.8): sự kiện / không làm phiền / âm thanh / bản tin của chính người gọi trước / sau chỉ phần đổi;
// sự kiện lạ → 400 như execute. Chỉ đọc (NotifyPrefsService.load trên DB nền tảng).
import type { ActionInput, ActionPreview, notificationUpdatePrefs } from '@appchat/actions';
import { AppError, isNotifyKind } from '@appchat/shared';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import type { NotifyPrefsService } from '../../services/prefs.service';

export async function prefsPreview(prefs: NotifyPrefsService | null, userId: string, i: ActionInput<typeof notificationUpdatePrefs>): Promise<ActionPreview> {
  if (!prefs) throw new AppError('INTERNAL', 500, undefined, 'notification.update_prefs cần NotifyPrefsService');
  const unknown = Object.keys(i.events ?? {}).find((k) => !isNotifyKind(k));
  if (unknown) throw new AppError('VALIDATION_FAILED', 400, { [`events.${unknown}`]: 'unknown_event' });
  const cur = await prefs.load(userId);
  const events = i.events ? Object.fromEntries(Object.keys(i.events).map((k) => [k, (cur.events as Record<string, unknown>)[k] ?? null])) : undefined;
  return preview('write', `${Object.keys(i.events ?? {}).length}`, {
    changes: updated('notification_pref', userId, { ...(events ? { events } : {}), dnd: cur.dnd, sound: cur.sound, digest: cur.digest }, { events: i.events, dnd: i.dnd, sound: i.sound, digest: i.digest }),
  });
}
