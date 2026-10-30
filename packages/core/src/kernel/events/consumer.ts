// Consumer của queue `events` (events/outbox.md §4): domain đăng ký bằng `registerEventConsumer` (top-level, như tenant seed).
// Runner chạy mọi consumer khớp topic; consumer đã ghi `event_consumption (event_id, consumer)` thì bỏ qua → chạy lại job an toàn.
import type { TenantDb } from '@appchat/db';

export interface DomainEvent {
  id: string;
  topic: string;
  workspaceId: string;
  payload: Record<string, unknown>;
  traceId: string | null;
}

export interface EventConsumer {
  /** Tên duy nhất, vd. `notify`, `realtime` — khoá idempotent. */
  name: string;
  /** Topic khớp chính xác, `*` (mọi topic) hoặc hàm (registry luật đọc lúc chạy — vd. luật thông báo domain đăng ký sau). */
  topics: readonly string[] | '*' | (() => readonly string[]);
  /**
   * `db` = DB tenant của workspace. Ghi `event_consumption` sau khi handle thành công (ngoài transaction của handler):
   * consumer tự đảm bảo idempotent ở trạng thái đích (id tất định / upsert) cho trường hợp lỗi giữa chừng.
   */
  handle(e: DomainEvent, db: TenantDb): Promise<void>;
}

const consumers = new Map<string, EventConsumer>();

export function registerEventConsumer(c: EventConsumer): void {
  if (consumers.has(c.name) && consumers.get(c.name) !== c) throw new Error(`Trùng event consumer: ${c.name}`);
  consumers.set(c.name, c);
}

/** Gỡ đăng ký — chỉ dùng trong test. */
export const unregisterEventConsumer = (name: string): boolean => consumers.delete(name);

export const eventConsumers = (): EventConsumer[] => [...consumers.values()];

export const consumersFor = (topic: string): EventConsumer[] =>
  eventConsumers().filter((c) => c.topics === '*' || (typeof c.topics === 'function' ? c.topics() : c.topics).includes(topic));
