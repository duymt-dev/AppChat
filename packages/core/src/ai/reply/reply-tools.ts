// Tool của một lượt agent trực kênh (Blueprint §5.1, §5.3 bước 3): action đã cấp ∩ connector đã nối (bỏ `message.send` — câu
// trả lời đi qua output có cấu trúc), ngữ cảnh hội thoại đang phục vụ, input khôi phục PII; cộng tool phối hợp nội bộ (origin
// `meta`, không vào registry): `handoff`, `transfer_to_agent`, `consult`. Tool phối hợp chỉ GHI KẾT QUẢ vào bước run — quyết định
// (đổi agent, chuyển người) do `reply.service` đọc lại các bước sau khi run xong (chạy tiếp ở process khác vẫn đúng).
import { registry } from '@appchat/actions';
import { unmaskPii, type PiiMap, type ToolOutcome, type ToolSpec } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { ToolExecutor } from '../../kernel/actions/executor';
import { connectedKeys, runToolIds } from '../agents/agent-tools';
import { agentSystem, agentToolSpecs } from '../agents/agent.runtime';
import type { AgentConfig } from '../agents/agent.store';
import { MAX_STEPS, type AiRunner } from '../runs/runner';
import { RunStore } from '../runs/run.store';
import { publishedAgent } from './reply-context';
import { agentKnowledge } from '../kb/scope/context';

export const META = { handoff: 'handoff', transfer: 'transfer_to_agent', consult: 'consult' } as const;
/** Độ sâu tối đa của consult / delegate (agent-gateway §5). */
export const MAX_DEPTH = 2;
const CONSULT_BUDGET = 40;
const RISK = new Map(registry.map((a) => [a.id, a.risk]));
const ROLES = ['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom'];

export interface ReplyToolDeps {
  db: TenantDb;
  executor: ToolExecutor;
  runner: AiRunner;
  now: () => Date;
}

export interface ReplyTurn {
  ws: string;
  runId: string;
  conversationId: string;
  agent: { id: string; toolIds: readonly string[] };
  cfg: AgentConfig;
  pii: PiiMap;
  /** Copilot: action ghi không chạy thật (chỉ xem trước) — gợi ý không được thay đổi dữ liệu. */
  dryRun: boolean;
}

const ok = (output: unknown): ToolOutcome => ({ kind: 'ok', output });
const err = (code: string, message: string): ToolOutcome => ({ kind: 'error', code, message });
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Agent khác đang chạy theo vai trò (không phải agent hiện tại) — sửa gần nhất trước. */
async function agentByRole(db: TenantDb, role: string, exceptId: string) {
  const rows = await db.aiAgent.findMany({
    where: { role, status: 'active', deletedAt: null, id: { not: exceptId }, publishedVersion: { gt: 0 } },
    orderBy: { updatedAt: 'desc' },
    take: 1,
    select: { id: true },
  });
  return rows[0] ? publishedAgent(db, rows[0].id) : null;
}

function metaTools(d: ReplyToolDeps, t: ReplyTurn): ToolSpec[] {
  const role = { type: 'string', enum: ROLES };
  return [
    {
      name: META.handoff,
      description: 'Hand the conversation over to a human staff member. The customer gets no reply from you this turn.',
      inputSchema: { type: 'object', properties: { reason: { type: 'string' }, summary: { type: 'string' } }, required: ['reason'] },
      origin: 'meta',
      execute: async (input) => {
        const i = input as { reason?: unknown; summary?: unknown };
        return ok({ handoff: true, reason: str(i.reason, 300), summary: str(i.summary, 1000) });
      },
    },
    {
      name: META.transfer,
      description: 'Transfer the conversation to another AI agent by role (sales, cs, booking, marketing, accounting, ops). It continues this turn with your summary.',
      inputSchema: { type: 'object', properties: { role, reason: { type: 'string' }, summary: { type: 'string' } }, required: ['role', 'summary'] },
      origin: 'meta',
      async execute(input) {
        const i = input as { role?: unknown; reason?: unknown; summary?: unknown };
        const target = await agentByRole(d.db, str(i.role, 20), t.agent.id);
        if (!target) return err('NOT_FOUND', `Không có agent đang chạy cho vai trò ${str(i.role, 20)}`);
        return ok({ agent_id: target.agent.id, agent: target.agent.name, reason: str(i.reason, 300), summary: str(i.summary, 1000) });
      },
    },
    {
      name: META.consult,
      description: 'Ask another AI agent (by role) a short question. It can only read data and never writes to the customer.',
      inputSchema: { type: 'object', properties: { role, question: { type: 'string' } }, required: ['role', 'question'] },
      origin: 'meta',
      execute: (input) => consult(d, t, input as { role?: unknown; question?: unknown }),
    },
  ];
}

/** `consult`: run con chỉ đọc (tool risk `read` của agent đích), độ sâu ≤ 2, ngân sách nhỏ, trả lời ngắn. */
async function consult(d: ReplyToolDeps, t: ReplyTurn, i: { role?: unknown; question?: unknown }): Promise<ToolOutcome> {
  const question = str(i.question, 1000);
  if (!question) return err('VALIDATION_FAILED', 'question rỗng');
  const store = new RunStore(d.db, d.now);
  const parent = await store.get(t.runId);
  if (!parent || parent.depth + 1 > MAX_DEPTH) return err('DEPTH_LIMIT', 'Quá độ sâu hỏi ý kiến');
  const target = await agentByRole(d.db, str(i.role, 20), t.agent.id);
  if (!target) return err('NOT_FOUND', `Không có agent đang chạy cho vai trò ${str(i.role, 20)}`);
  const ids = runToolIds(target.cfg.tools, await connectedKeys(d.db)).filter((id) => RISK.get(id) === 'read');
  const row = await store.create({
    kind: 'consult',
    title: `consult:${target.agent.name}`,
    tier: target.cfg.model_tier,
    input: { question },
    parentRunId: t.runId,
    agentId: target.agent.id,
    agentVersion: target.version,
    conversationId: t.conversationId,
    maxCredits: CONSULT_BUDGET,
    // TIP-020c: con hỏi ý kiến trong lượt kênh — phạm vi của agent đích, trần public (khách), không quyền rộng của cha.
    knowledge: agentKnowledge({ agentId: target.agent.id, version: target.version, cfg: target.cfg }, { channel: true, parentRunId: t.runId }),
  });
  const tools = agentToolSpecs(d.executor, ids, { workspaceId: t.ws, agent: { id: target.agent.id, toolIds: target.cfg.tools }, runId: row.id, source: 'agent', db: d.db });
  const system = `${agentSystem(target.cfg)}\n\nĐồng nghiệp AI hỏi ý kiến bạn. Trả lời ngắn gọn, chỉ dựa trên dữ liệu tra được; không gửi gì cho khách.`;
  const r = await d.runner.start(t.ws, store, row, { system, messages: [{ role: 'user', content: question }], tools, maxSteps: MAX_STEPS.agent, source: 'inbox' });
  return r.status === 'completed' ? ok({ agent: target.agent.name, answer: r.text.slice(0, 2000) }) : err('CONSULT_FAILED', r.error?.message ?? r.status);
}

/** Ghi nhớ (TIP-015b): khách lấy từ hội thoại đang phục vụ (server), không tin `contact_id` model gửi; hội thoại chưa gắn khách → để trống (422/403). */
const REMEMBER = 'contact__remember';

/** Bỏ `contact_id` khỏi schema model thấy; mọi lời gọi gắn khách của hội thoại đang phục vụ (executor vẫn kiểm lại). */
function bindServed(s: ToolSpec, contactId: string): ToolSpec {
  const sc = s.inputSchema as { properties?: Record<string, unknown>; required?: string[] };
  const properties = Object.fromEntries(Object.entries(sc.properties ?? {}).filter(([k]) => k !== 'contact_id'));
  return {
    ...s,
    inputSchema: { ...sc, properties, required: (sc.required ?? []).filter((k) => k !== 'contact_id') },
    execute: (input, meta) => s.execute({ ...(input && typeof input === 'object' ? input : {}), contact_id: contactId }, meta),
  };
}

/** Bộ tool đầy đủ của lượt: action (đã lọc) + tool phối hợp. Copilot: action ghi trả `dry_run` (không thay đổi dữ liệu). */
export async function replyTools(d: ReplyToolDeps, t: ReplyTurn): Promise<ToolSpec[]> {
  const ids = runToolIds(t.cfg.tools, await connectedKeys(d.db)).filter((id) => id !== 'message.send');
  const served = ids.includes('contact.remember') ? (await d.db.conversation.findUnique({ where: { id: t.conversationId }, select: { contactId: true } }))?.contactId ?? '' : '';
  const actions = agentToolSpecs(d.executor, ids, {
    workspaceId: t.ws,
    agent: t.agent,
    runId: t.runId,
    source: 'agent',
    servedConversationId: t.conversationId,
    mapInput: (input) => unmaskPii(input, t.pii),
    db: d.db,
  }).map((s) => {
    const id = s.name.replaceAll('__', '.');
    if (!t.dryRun || RISK.get(id) === 'read') return s;
    return { ...s, execute: async (input: unknown): Promise<ToolOutcome> => ok({ dry_run: true, would_call: id, input }) };
  }).map((s) => (s.name === REMEMBER ? bindServed(s, served) : s));
  return [...actions, ...metaTools(d, t)];
}
