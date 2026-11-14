// Metadata envelope v2 (TIP-003b §1.1): từ topic + payload ĐÃ có `ws` / `occurred_at` → kiểm schema zod của topic, trần kích thước,
// workspace khớp, rồi trả (aggregate_kind, aggregate_id) theo AGGREGATE_RULES. Topic lạ / thiếu trường id / sai workspace → lỗi TRƯỚC
// commit (không bao giờ rơi về "không thứ tự").
import { EVENT_SCHEMAS } from '../../events';
import { AGGREGATE_RULES } from './aggregate';

export const EVENT_PROTOCOL_VERSION = 2;
/** Trần mỗi transaction / mỗi payload (§1.5) — vượt thì lỗi trước commit, không cắt bớt. */
export const MAX_EVENTS_PER_TX = 1000;
export const MAX_PAYLOAD_BYTES = 128 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EventProtocolErrorCode = 'EVENT_TOPIC_UNKNOWN' | 'EVENT_PAYLOAD_INVALID' | 'EVENT_PAYLOAD_TOO_LARGE' | 'EVENT_AGGREGATE_MISSING' | 'EVENT_WORKSPACE_MISMATCH' | 'EVENT_BATCH_TOO_LARGE'
  /** v2: writeOutbox ngoài transaction đã đăng ký (withEventTransaction). */
  | 'EVENT_TRANSACTION_REQUIRED'
  | 'EVENT_TRANSACTION_CLOSED'
  /** Workspace đang bị rào cutover — producer phải chờ / thử lại. */
  | 'EVENT_PROTOCOL_FENCED'
  | 'EVENT_REGISTRY_MISSING';

export class EventProtocolError extends Error {
  constructor(readonly code: EventProtocolErrorCode, readonly topic: string, detail?: string) {
    super(`${code}: ${topic}${detail ? ` (${detail})` : ''}`);
    this.name = 'EventProtocolError';
  }
}

export interface EventMetadata {
  topic: string;
  aggregateKind: string;
  aggregateId: string;
  /** Payload đã qua zod (bản sao — không giữ tham chiếu của caller). */
  payload: Record<string, unknown>;
}

export const isDeclaredTopic = (topic: string): boolean => Object.hasOwn(EVENT_SCHEMAS, topic) && Object.hasOwn(AGGREGATE_RULES, topic);

/**
 * Kiểm + suy metadata. `eventId` chỉ dùng cho ý định độc lập (stream = chính event). `ws` là workspace đã xác thực của transaction,
 * không phải giá trị payload tự khai.
 */
export function eventMetadata(topic: string, payload: Record<string, unknown>, ws: string, eventId: string): EventMetadata {
  if (!isDeclaredTopic(topic)) throw new EventProtocolError('EVENT_TOPIC_UNKNOWN', topic);
  const raw = JSON.stringify(payload);
  if (new TextEncoder().encode(raw).length > MAX_PAYLOAD_BYTES) throw new EventProtocolError('EVENT_PAYLOAD_TOO_LARGE', topic);
  const schema = EVENT_SCHEMAS[topic as keyof typeof EVENT_SCHEMAS];
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new EventProtocolError('EVENT_PAYLOAD_INVALID', topic, parsed.error.issues.map((i) => i.path.join('.')).join(','));
  // zod object mặc định bỏ trường lạ — giữ nguyên payload gốc (đã kiểm) để không âm thầm cắt scope / provenance.
  const value = JSON.parse(raw) as Record<string, unknown>;
  if (value.ws !== ws) throw new EventProtocolError('EVENT_WORKSPACE_MISMATCH', topic);
  if (typeof value.workspace_id === 'string' && value.workspace_id !== ws) throw new EventProtocolError('EVENT_WORKSPACE_MISMATCH', topic);
  const rule = AGGREGATE_RULES[topic]!;
  const id = rule.key === 'ws' ? ws : rule.key === 'event_id' ? eventId : value[rule.key];
  if (typeof id !== 'string' || !UUID.test(id)) throw new EventProtocolError('EVENT_AGGREGATE_MISSING', topic, rule.key);
  return { topic, aggregateKind: rule.kind, aggregateId: id.toLowerCase(), payload: value };
}
