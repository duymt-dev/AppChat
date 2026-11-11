// Dựng / đọc binding tri thức (TIP-020c §1.1–1.3). Server adapter dựng lúc tạo run (Trợ lý / agent / Builder); `kb.search` và chạy tiếp
// đọc lại từ `ai_run.knowledge` theo `ActionContext.runId` (runtime đặt — HTTP không đặt được). Run agent / tác vụ thiếu binding (run cũ
// trước TIP này) → `scope_unavailable`, KHÔNG suy ra "không giới hạn". Phạm vi chuẩn hoá: UUID thư mục duy nhất, thẻ cắt / duy nhất.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import type { AgentConfig } from '../../agents/agent.store';
import { MAX_SCOPE_ITEMS, type KbScope, type KnowledgeContext, type KnowledgeMode } from './types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeScope(s: Partial<KbScope> | null | undefined): KbScope {
  const folders = [...new Set((s?.folder_ids ?? []).filter((x): x is string => typeof x === 'string' && UUID.test(x)).map((x) => x.toLowerCase()))].sort();
  const tags = [...new Set((s?.tags ?? []).filter((x): x is string => typeof x === 'string').map((x) => x.trim()).filter((x) => x && x.length <= 30))].sort();
  return { folder_ids: folders.slice(0, MAX_SCOPE_ITEMS), tags: tags.slice(0, MAX_SCOPE_ITEMS) };
}

export const scopeEmpty = (s: KbScope) => !s.folder_ids.length && !s.tags.length;

export const assistantKnowledge = (userId: string): KnowledgeContext => ({ v: 1, kind: 'assistant_unscoped', user_id: userId });

/** Agent đã xuất bản: phạm vi lấy từ bản đã xuất bản (không từ nháp Builder). Có người ra lệnh → `commander`, không → kênh (chỉ public). */
export function agentKnowledge(a: { agentId: string; version: number; cfg: Pick<AgentConfig, 'kb_scope'> }, o: { commanderId?: string | null; parentRunId?: string | null; channel?: boolean } = {}): KnowledgeContext {
  const mode: KnowledgeMode = o.channel || !o.commanderId ? 'channel' : 'commander';
  return {
    v: 1,
    kind: 'agent_scoped',
    agent_id: a.agentId,
    admitted_version: a.version,
    scope: normalizeScope(a.cfg.kb_scope),
    mode,
    ...(mode === 'commander' && o.commanderId ? { commander_id: o.commanderId } : {}),
    ...(o.parentRunId ? { parent_run_id: o.parentRunId } : {}),
  };
}

/** Chat thử Builder: phạm vi nháp chỉ là bộ chọn THÊM dưới quyền đọc hiện hành của người thử; mô phỏng kênh → public. */
export function builderKnowledge(cfg: Pick<AgentConfig, 'kb_scope'>, commanderId: string, o: { channel: boolean; agentId?: string | null }): KnowledgeContext {
  const scope = normalizeScope(cfg.kb_scope);
  const draft_digest = createHash('sha256').update(JSON.stringify(scope)).digest('hex').slice(0, 32);
  return { v: 1, kind: 'builder_preview', draft_digest, scope, commander_id: commanderId, mode: o.channel ? 'channel' : 'commander', ...(o.agentId ? { agent_id: o.agentId } : {}) };
}

/** Đọc binding đã lưu; khuôn lạ / phiên bản lạ → null (người gọi coi là scope_unavailable). */
export function parseKnowledge(v: unknown): KnowledgeContext | null {
  const k = v as Partial<KnowledgeContext> | null;
  if (!k || typeof k !== 'object' || k.v !== 1) return null;
  if (k.kind === 'assistant_unscoped') return typeof k.user_id === 'string' ? (k as KnowledgeContext) : null;
  if (k.kind === 'agent_scoped' || k.kind === 'builder_preview') {
    const x = k as Extract<KnowledgeContext, { kind: 'agent_scoped' | 'builder_preview' }>;
    if (!x.scope || (x.mode !== 'channel' && x.mode !== 'commander')) return null;
    return { ...x, scope: normalizeScope(x.scope) } as KnowledgeContext;
  }
  return null;
}

type RunDb = Pick<TenantDb, 'aiRun'>;

/** Ghi binding lên run (server — ngay sau khi tạo run, trước khi tool nào chạy). */
export async function bindKnowledge(db: RunDb, runId: string, k: KnowledgeContext): Promise<void> {
  await db.aiRun.update({ where: { id: runId }, data: { knowledge: k as object } });
}

/**
 * Binding hiệu lực của run đang gọi tool: chính run, không có thì gần nhất trên chuỗi cha (run tiện ích con của tool không tự có binding).
 * Không có run (gọi trực tiếp từ UI) → null: người gọi dùng Trợ lý theo người hiệu lực.
 */
export async function knowledgeOfRun(db: RunDb, runId: string): Promise<{ found: boolean; k: KnowledgeContext | null; runId: string; kind: string | null }> {
  let id: string | null = runId;
  for (let i = 0; id && i < 6; i++) {
    const r: { id: string; kind: string; knowledge: unknown; parentRunId: string | null; agentId: string | null; initiatedByUserId: string | null } | null = await db.aiRun.findUnique({ where: { id }, select: { id: true, kind: true, knowledge: true, parentRunId: true, agentId: true, initiatedByUserId: true } });
    if (!r) return { found: false, k: null, runId, kind: null };
    if (r.knowledge !== null && r.knowledge !== undefined) return { found: true, k: parseKnowledge(r.knowledge), runId: r.id, kind: r.kind };
    // Run có agent mà thiếu binding (run cũ) → dừng ngay: không leo lên cha để lấy quyền rộng hơn.
    if (r.agentId || r.kind === 'agent_reply' || r.kind === 'suggestion' || r.kind === 'delegate' || r.kind === 'task') return { found: true, k: null, runId: r.id, kind: r.kind };
    // Gốc Trợ lý cũ (trước binding) do một người khởi tạo → chỉ quyền của chính người đó (resolve kiểm đúng người của lời gọi).
    if (!r.parentRunId && r.kind === 'assistant' && r.initiatedByUserId) return { found: true, k: assistantKnowledge(r.initiatedByUserId), runId: r.id, kind: r.kind };
    id = r.parentRunId;
  }
  return { found: true, k: null, runId, kind: null };
}
