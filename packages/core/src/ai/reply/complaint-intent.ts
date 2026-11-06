// Ý định khiếu nại của lượt (TIP-022b D): bàn giao vì khiếu nại / sự cố ở chế độ auto → ghi outbox `ai.complaint_detected` (tin khách nguồn
// + hội thoại + run + agent + fence) cùng lúc bàn giao. Consumer bên support (ROLE=jobs) kiểm lại agent đã xuất bản + grant `ticket.create`
// hiện hành + phạm vi hội thoại rồi gọi Executor với actor agent (không bao giờ Owner hệ thống). Copilot / lịch sử / chat thử / dryRun
// không ghi event này. Tiêu đề / mô tả lấy từ tóm tắt an toàn (không từ JSON model tuỳ ý).
import type { TenantDb } from '@appchat/db';
import { markDirty, writeOutbox } from '../../kernel/outbox/outbox';
import type { KeyValueStore } from '../../kernel/redis';

export const AI_COMPLAINT_TOPIC = 'ai.complaint_detected';

export interface ComplaintIntent {
  conversationId: string;
  sourceMessageId: string;
  runId: string;
  agentId: string;
  fence: number;
}

export async function recordComplaintIntent(db: TenantDb, kv: KeyValueStore, ws: string, i: ComplaintIntent, now: Date): Promise<void> {
  await db.$transaction((tx) =>
    writeOutbox(tx, ws, [{ topic: AI_COMPLAINT_TOPIC, payload: { conversation_id: i.conversationId, source_message_id: i.sourceMessageId, run_id: i.runId, agent_id: i.agentId, fence: i.fence } }], now),
  );
  await markDirty(kv, ws);
}

/** Lý do bàn giao là khiếu nại / sự cố (luật handoff `complaint` hoặc ý định model `complaint`). */
export const isComplaint = (rule: string | null, intent: string | null) => rule === 'complaint' || intent === 'complaint';
