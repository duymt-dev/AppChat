// Mốc hoạt động của workspace (TIP-041 §1, Blueprint §2.0 bước 5 "Hoạt động" = max của: thành viên mở workspace, tin vào / ra, action
// bất kỳ). Ghi `workspace_stats.last_active_at` bằng GREATEST (sự kiện cũ / thử lại không kéo lùi, không kéo dài quá mốc gốc). Mốc lấy từ
// thời điểm GỐC của sự kiện (`occurred_at` của outbox — lúc commit nghiệp vụ), không phải lúc consumer chạy. Không đặt lại vì job thống
// kê / healthcheck. Đọc hoạt động khi quét: thiếu mốc → "không rõ", KHÔNG coi là không hoạt động.
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';
import { registerEventConsumer, type DomainEvent, type EventConsumer } from '../../kernel/events/consumer';

type Db = Pick<PlatformDb, '$executeRaw'> | PlatformTx;

/** Đẩy mốc hoạt động lên `at` nếu mới hơn (một câu INSERT … ON CONFLICT … GREATEST — đồng thời không mất mốc). */
export async function touchActivity(db: Db, workspaceId: string, at: Date): Promise<void> {
  await db.$executeRaw`INSERT INTO "workspace_stats" ("workspace_id", "last_active_at") VALUES (${workspaceId}::uuid, ${at})
    ON CONFLICT ("workspace_id") DO UPDATE SET "last_active_at" = GREATEST(COALESCE("workspace_stats"."last_active_at", '-infinity'::timestamptz), EXCLUDED."last_active_at")`;
}

/** Sự kiện được tính là hoạt động: tin vào / tin ra + action do người / agent / Trợ lý chạy (không system / job bảo trì). */
export const ACTIVITY_TOPICS = ['message.received', 'message.sent', 'workspace.activity'] as const;

/** Thời điểm gốc của sự kiện; thiếu / sai → null (không suy ra hoạt động lúc consumer chạy). */
export const occurredAt = (e: DomainEvent): Date | null => {
  const v = e.payload.occurred_at;
  const d = typeof v === 'string' ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

/** Consumer `lifecycle.activity` (ROLE=jobs): idempotent theo `event_consumption` + GREATEST (chạy lại không đổi kết quả). */
export function activityConsumer(platform: Pick<PlatformDb, '$executeRaw'>): EventConsumer {
  return {
    name: 'lifecycle.activity',
    topics: ACTIVITY_TOPICS,
    async handle(e) {
      const at = occurredAt(e);
      if (at) await touchActivity(platform, e.workspaceId, at);
    },
  };
}

export const installActivityConsumer = (platform: Pick<PlatformDb, '$executeRaw'>) => registerEventConsumer(activityConsumer(platform));
