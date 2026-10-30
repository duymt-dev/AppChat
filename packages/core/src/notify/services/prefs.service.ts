// Tuỳ chọn thông báo của user (DB nền tảng `notification_pref` — DC-028). Thiếu dòng = mặc định danh mục.
import {
  DEFAULT_NOTIFY_PREFS,
  NOTIFY_GROUPS,
  NOTIFY_KINDS,
  NOTIFY_KIND_KEYS,
  channelsFor,
  type NotifyPrefsData,
  type NotifyPrefsDto,
} from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';

type Db = Pick<PlatformDb, 'notificationPref'> | PlatformTx;

export class NotifyPrefsService {
  constructor(private readonly db: Pick<PlatformDb, 'notificationPref'>) {}

  async load(userId: string, db: Db = this.db): Promise<NotifyPrefsData> {
    const row = await db.notificationPref.findUnique({ where: { userId } });
    if (!row) return { events: {}, ...structuredClone(DEFAULT_NOTIFY_PREFS) };
    return {
      events: (row.events ?? {}) as NotifyPrefsData['events'],
      dnd: { ...DEFAULT_NOTIFY_PREFS.dnd, ...((row.dnd ?? {}) as object) },
      sound: row.sound,
      digest: row.digest as NotifyPrefsData['digest'],
    };
  }

  /** Nhiều user một lần (consumer notify). */
  async loadMany(userIds: readonly string[]): Promise<Map<string, NotifyPrefsData>> {
    const rows = await this.db.notificationPref.findMany({ where: { userId: { in: [...userIds] } } });
    const out = new Map<string, NotifyPrefsData>();
    for (const id of userIds) out.set(id, { events: {}, ...structuredClone(DEFAULT_NOTIFY_PREFS) });
    for (const r of rows)
      out.set(r.userId, {
        events: (r.events ?? {}) as NotifyPrefsData['events'],
        dnd: { ...DEFAULT_NOTIFY_PREFS.dnd, ...((r.dnd ?? {}) as object) },
        sound: r.sound,
        digest: r.digest as NotifyPrefsData['digest'],
      });
    return out;
  }

  /** Shape `GET /v1/settings/notifications` (packages/shared/src/api/notify.ts). */
  async view(userId: string): Promise<NotifyPrefsDto> {
    const p = await this.load(userId);
    return {
      groups: NOTIFY_GROUPS.map((g) => ({
        key: g,
        events: NOTIFY_KIND_KEYS.filter((k) => NOTIFY_KINDS[k].group === g).map((k) => ({ key: k, ...channelsFor(p, k) })),
      })),
      dnd: p.dnd,
      sound: p.sound,
      digest: p.digest,
    };
  }

  /** Gộp patch (chỉ trường có mặt) — gọi trong ptx của action `notification.update_prefs`. */
  async update(tx: PlatformTx, userId: string, patch: Partial<NotifyPrefsData>): Promise<{ before: NotifyPrefsData; after: NotifyPrefsData }> {
    const before = await this.load(userId, tx);
    const after: NotifyPrefsData = {
      events: { ...before.events, ...(patch.events ?? {}) },
      dnd: patch.dnd ?? before.dnd,
      sound: patch.sound ?? before.sound,
      digest: patch.digest ?? before.digest,
    };
    const data = { events: after.events, dnd: after.dnd, sound: after.sound, digest: after.digest };
    await tx.notificationPref.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    return { before, after };
  }
}
