// Action đọc cấu hình AI cho Trợ lý (TIP-023b R2 · DC-224 · SPEC A): agent, kho tri thức, tác vụ AI, run. Giữ quyền quản trị của route
// tương ứng (agents.manage / kb.manage / ai_task.manage / assistant.use) — không hạ quyền để model đọc được. Không trả system prompt,
// persona, nội dung tài liệu, URL / tệp, hay đầu vào / ra của run. Không agentGrantable: agent trực kênh không đọc cấu hình nội bộ.
import { z } from 'zod';
import { defineAction } from '../define';

const q = z.string().trim().max(80).optional();
const limit = z.number().int().min(1).max(20).optional();

export const agentSearch = defineAction({
  id: 'agent.search',
  module: 'ai',
  title: 'actions.agent.search.title',
  description: 'Find AI agents by name or role (sales, cs, booking, marketing, accounting, ops); returns agent_id, status and published version. Example: {"q":"sales"}',
  input: z.object({ q, status: z.enum(['active', 'paused', 'draft']).optional(), limit }),
  output: z.object({ agents: z.array(z.object({ id: z.string(), name: z.string(), role: z.string(), status: z.string(), published_version: z.number().int() })) }),
  permission: 'agents.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const kbSourceSearch = defineAction({
  id: 'kb.source_search',
  module: 'ai',
  title: 'actions.kb.source_search.title',
  description: 'Find knowledge-base sources (documents, links, notes) by name or tag; returns source_id, status and visibility — not their content (use kb.search for answers). Example: {"q":"bảng giá"}',
  input: z.object({ q, status: z.enum(['pending', 'processing', 'ready', 'failed']).optional(), limit }),
  output: z.object({ sources: z.array(z.object({ id: z.string(), name: z.string(), kind: z.string(), status: z.string(), visibility: z.string(), tags: z.array(z.string()) })) }),
  permission: 'kb.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const aiTaskSearch = defineAction({
  id: 'ai_task.search',
  module: 'ai',
  title: 'actions.ai_task.search.title',
  description: 'Find scheduled / triggered AI tasks by name; returns task_id, status, trigger and last run. Example: {"q":"bản tin sáng"}',
  input: z.object({ q, limit }),
  output: z.object({ tasks: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), trigger: z.string(), last_run_at: z.string().nullable(), last_run_status: z.string().nullable() })) }),
  permission: 'ai_task.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const assistantAgentChoices = defineAction({
  id: 'assistant.agent_choices',
  module: 'ai',
  title: 'actions.assistant.agent_choices.title',
  description: 'Page active/published AI agents a user may select as Cowork specialist (id, name, role, model tier) — safe display metadata only, no draft prompt/persona/tier. Example: {"limit":30}',
  input: z.object({ cursor: z.string().max(200).optional(), limit: z.number().int().min(1).max(100).optional() }),
  output: z.object({ data: z.array(z.object({ id: z.string(), name: z.string(), role: z.string(), role_label: z.string(), model_tier: z.string() })), next_cursor: z.string().nullable() }),
  permission: 'assistant.use',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const runSearch = defineAction({
  id: 'run.search',
  module: 'ai',
  title: 'actions.run.search.title',
  description: 'List recent AI runs (assistant, agents, tasks) with status, title and credits — no inputs / outputs. Use the run_id to cancel. Example: {"status":"running"}',
  input: z.object({ status: z.enum(['running', 'waiting_approval', 'done']).optional(), limit }),
  output: z.object({ runs: z.array(z.object({ id: z.string(), kind: z.string(), title: z.string(), status: z.string(), credits: z.number().int(), started_at: z.string() })) }),
  permission: 'assistant.use',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
