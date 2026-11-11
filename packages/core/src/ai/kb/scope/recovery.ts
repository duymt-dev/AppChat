// Chạy tiếp / khôi phục run có binding tri thức (TIP-020c §1.3, §3.6): job chỉ mang id run (định vị); binding đọc lại từ `ai_run.knowledge`.
// Run agent / tác vụ / ủy quyền thiếu binding (tạo trước TIP này) → dừng `scope_unavailable` với lời nhắn an toàn — KHÔNG tự điền mọi
// thư mục / thẻ, KHÔNG tự chạy lại / trừ tiền; người dùng chủ động bắt đầu yêu cầu mới. Nguồn đã dùng không còn hợp lệ → dừng
// `knowledge_revoked` trước lời gọi model kế.
import type { TenantDb } from '@appchat/db';
import { parseKnowledge } from './context';
import { knowledgeCurrent, type WhoResolver } from './provenance';

export const KNOWLEDGE_STOP = { unavailable: 'SCOPE_UNAVAILABLE', revoked: 'KNOWLEDGE_REVOKED' } as const;

const AGENT_KINDS = new Set(['agent_reply', 'suggestion', 'delegate', 'task']);

/** Run cần binding: có agent hoặc thuộc loại chạy agent. Trợ lý thường / run tiện ích không agent → không bắt buộc. */
export const needsBinding = (r: { kind: string; agentId: string | null }) => !!r.agentId || AGENT_KINDS.has(r.kind);

type Db = Pick<TenantDb, 'aiRun' | 'aiAgent' | 'aiAgentVersion' | '$queryRaw'>;

/** Kiểm trước khi chạy tiếp / trước mỗi lời gọi model: null = được chạy; còn lại = mã dừng an toàn. */
export async function resumeGate(db: Db, runId: string, who: WhoResolver = null): Promise<string | null> {
  const r = await db.aiRun.findUnique({ where: { id: runId }, select: { kind: true, agentId: true, knowledge: true } });
  if (!r) return null;
  if (needsBinding(r) && !parseKnowledge(r.knowledge)) return KNOWLEDGE_STOP.unavailable;
  return (await knowledgeCurrent(db, runId, who)) ? null : KNOWLEDGE_STOP.revoked;
}

/** Lỗi ném ra trong hook trước bước (engine hiểu `code`) — run dừng có lý do, không chạy model. */
export const knowledgeStop = (code: string) => Object.assign(new Error(code === KNOWLEDGE_STOP.unavailable ? 'scope_unavailable' : 'knowledge_revoked'), { code });
