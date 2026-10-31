// AI Agents · Duyệt · Tác vụ tự chủ (Blueprint §3.4 ai, D29). Prototype L1178–1504, L2227–2450.
import { z } from 'zod';
import { defineAction } from './define';

const agentId = z.string().min(1);
const tier = z.enum(['standard', 'advanced', 'max']);

/** Cấu hình agent = các cột bản nháp của `ai_agent` (Blueprint §2.2); xuất bản thì chụp thành `ai_agent_version`. */
const agentConfig = z.object({
  name: z.string().trim().min(1).max(80),
  emoji: z.string().max(8).optional(),
  role: z.enum(['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom']).optional(),
  /** Nhãn vai trò hiển thị trên thẻ agent ("Tư vấn & chốt đơn") + tính cách — prototype L2280. */
  role_label: z.string().max(80).optional(),
  persona: z.string().max(500).optional(),
  language: z.enum(['vi', 'en', 'bilingual', 'auto']).optional(),
  prompt: z.string().max(8000).optional(),
  intents: z.array(z.number().int().min(0)).optional(),
  model_tier: tier.optional(),
  tools: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
  threshold: z.number().int().min(50).max(95).optional(),
  handoff_to: z.enum(['staff', 'team', 'lead']).optional(),
  governance: z.record(z.string(), z.boolean()).optional(),
  /** Phạm vi kiến thức (D54, rag.md §2): thư mục + thẻ trong kho chung của workspace. */
  kb_scope: z.object({ folder_ids: z.array(z.string()).max(50), tags: z.array(z.string().max(30)).max(50) }).optional(),
  template_id: z.string().optional(),
  /** Phân luồng (prototype L2710): từ khoá ưu tiên + khung giờ hoạt động (giờ hành chính 8:00–17:30 giờ VN). */
  keywords: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  working_hours: z.enum(['always', 'office', 'custom']).optional(),
});

export const agentDraftFromDescription = defineAction({
  id: 'agent.draft_from_description',
  module: 'ai',
  title: 'actions.agent.draft_from_description.title',
  description: 'Draft a full agent config from a plain-language description (no write). Example: {"description":"Agent CSKH cho spa, đặt lịch qua Zalo"}',
  input: z.object({ description: z.string().trim().min(4).max(2000) }),
  output: z.object({ draft: agentConfig }),
  permission: 'agents.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const agentCreate = defineAction({
  id: 'agent.create',
  module: 'ai',
  title: 'actions.agent.create.title',
  description: 'Create an agent as draft (not running until published). Fails with PLAN_LIMIT_REACHED over plan.max_agents. Example: {"name":"Sales Agent","model_tier":"advanced"}',
  input: agentConfig,
  output: z.object({ agent_id: z.string() }),
  permission: 'agents.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['agents'],
  db: 'platform',
  uiTarget: (o) => ({ type: 'open', entity: 'agent', id: o.agent_id, view: 'page' }),
});

export const agentCreateAndPublish = defineAction({
  id: 'agent.create_and_publish',
  module: 'ai',
  title: 'actions.agent.create_and_publish.title',
  description: 'Create and publish an agent in one confirmed step (D29: assistant flow after one user confirmation). Example: {"name":"CSKH Spa","role":"cs","channels":["zalo_personal"]}',
  input: agentConfig,
  output: z.object({ agent_id: z.string(), version: z.number() }),
  permission: 'agents.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['agents'],
  db: 'platform',
  uiTarget: (o) => ({ type: 'open', entity: 'agent', id: o.agent_id, view: 'page' }),
});

export const agentUpdate = defineAction({
  id: 'agent.update',
  module: 'ai',
  title: 'actions.agent.update.title',
  description: 'Update the draft config of an agent (running version unchanged until publish). Example: {"agent_id":"ag_sales","patch":{"threshold":80}}',
  input: z.object({ agent_id: agentId, patch: agentConfig.partial() }),
  output: z.object({ agent_id: z.string() }),
  permission: 'agents.manage',
  risk: 'config',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['agents'],
});

export const agentPublish = defineAction({
  id: 'agent.publish',
  module: 'ai',
  title: 'actions.agent.publish.title',
  description: 'Publish the current draft as a new version. Example: {"agent_id":"ag_sales","note":"Thêm bảng giá"}',
  input: z.object({ agent_id: agentId, note: z.string().max(200).optional() }),
  output: z.object({ agent_id: z.string(), version: z.number() }),
  permission: 'agents.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['agents'],
});

export const agentRollback = defineAction({
  id: 'agent.rollback',
  module: 'ai',
  title: 'actions.agent.rollback.title',
  description: 'Roll an agent back to a previous published version (creates a new version from it). Example: {"agent_id":"ag_sales","version":2}',
  input: z.object({ agent_id: agentId, version: z.number().int().min(1) }),
  output: z.object({ agent_id: z.string(), version: z.number() }),
  permission: 'agents.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['agents'],
});

export const agentPause = defineAction({
  id: 'agent.pause',
  module: 'ai',
  title: 'actions.agent.pause.title',
  description: 'Pause or resume an agent. Example: {"agent_id":"ag_sales","paused":true}',
  input: z.object({ agent_id: agentId, paused: z.boolean() }),
  output: z.object({ agent_id: z.string(), status: z.string() }),
  permission: 'agents.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['agents'],
});

export const agentDelete = defineAction({
  id: 'agent.delete',
  module: 'ai',
  title: 'actions.agent.delete.title',
  description: 'Delete an agent (soft, restorable 30 days). Example: {"agent_id":"ag_retention"}',
  input: z.object({ agent_id: agentId }),
  output: z.object({ agent_id: z.string() }),
  permission: 'agents.manage',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 2_592_000 },
  invalidates: ['agents'],
});

export const agentTest = defineAction({
  id: 'agent.test',
  module: 'ai',
  title: 'actions.agent.test.title',
  description: 'Dry-run one chat turn against the draft config; tool calls are only previewed. Example: {"agent_id":"ag_sales","text":"Giá liệu trình bao nhiêu?"}',
  input: z.object({ agent_id: agentId.optional(), config: agentConfig.partial().optional(), text: z.string().trim().min(1).max(2000), channel: z.string().max(40).optional() }),
  output: z.object({ reply: z.string() }),
  permission: 'agents.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const agentOptimizePrompt = defineAction({
  id: 'agent.optimize_prompt',
  module: 'ai',
  title: 'actions.agent.optimize_prompt.title',
  description: 'Return an improved system prompt (no write). Example: {"prompt":"# VAI TRÒ\\nBạn là trợ lý CSKH"}',
  input: z.object({ prompt: z.string().max(8000) }),
  output: z.object({ prompt: z.string() }),
  permission: 'agents.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const runCancel = defineAction({
  id: 'run.cancel',
  module: 'ai',
  title: 'actions.run.cancel.title',
  description: 'Stop a running agent orchestration run (Cowork). Example: {"run_id":"run_1"}',
  input: z.object({ run_id: z.string().min(1) }),
  output: z.object({ run_id: z.string(), status: z.string() }),
  permission: 'ai_task.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['runs'],
});

const approvalId = z.string().min(1);

export const approvalApprove = defineAction({
  id: 'approval.approve',
  module: 'ai',
  title: 'actions.approval.approve.title',
  description: 'Approve a pending agent action; also requires the approve permission of the original action. Example: {"approval_id":"ap_1"}',
  input: z.object({ approval_id: approvalId, note: z.string().max(500).optional() }),
  output: z.object({ approval_id: z.string(), status: z.string() }),
  permission: 'approvals.decide',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['approvals', 'action-logs', 'nav'],
});

export const approvalReject = defineAction({
  id: 'approval.reject',
  module: 'ai',
  title: 'actions.approval.reject.title',
  description: 'Reject a pending agent action with a reason. Example: {"approval_id":"ap_1","note":"Sai đối tượng"}',
  input: z.object({ approval_id: approvalId, note: z.string().max(500).optional() }),
  output: z.object({ approval_id: z.string(), status: z.string() }),
  permission: 'approvals.decide',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['approvals', 'action-logs', 'nav'],
});

export const approvalEditAndApprove = defineAction({
  id: 'approval.edit_and_approve',
  module: 'ai',
  title: 'actions.approval.edit_and_approve.title',
  description: 'Correct the input of a pending agent action, then approve it (the corrected input runs exactly once). Example: {"approval_id":"ap_1","edited_input":{"amount":"500000"}}',
  input: z.object({ approval_id: approvalId, edited_input: z.record(z.string(), z.unknown()), note: z.string().max(500).optional() }),
  output: z.object({ approval_id: z.string(), status: z.string() }),
  permission: 'approvals.decide',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['approvals', 'action-logs', 'nav'],
});

const taskFields = z.object({
  name: z.string().trim().min(1).max(120),
  goal: z.string().trim().min(1).max(4000),
  department: z.string().max(40).optional(),
  agent_id: z.string().optional(),
  trigger: z.enum(['manual', 'schedule', 'event']),
  data_scope: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  model_tier: tier,
  ask_before_send: z.boolean(),
  credit_limit_per_run: z.number().int().min(0).max(1_000_000),
});

export const aiTaskCreate = defineAction({
  id: 'ai_task.create',
  module: 'ai',
  title: 'actions.ai_task.create.title',
  description: 'Create an autonomous multi-step task (Cowork). trigger "manual" also runs it once now. Example: {"name":"Báo cáo tuần","goal":"…","trigger":"manual","model_tier":"standard","ask_before_send":true,"credit_limit_per_run":2000}',
  input: taskFields,
  output: z.object({ task_id: z.string() }),
  permission: 'ai_task.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['ai-tasks'],
  uiTarget: (o) => ({ type: 'open', entity: 'ai_task', id: o.task_id, view: 'drawer' }),
});

export const aiTaskUpdate = defineAction({
  id: 'ai_task.update',
  module: 'ai',
  title: 'actions.ai_task.update.title',
  description: 'Update an autonomous task. Example: {"task_id":"tk_1","patch":{"credit_limit_per_run":3000}}',
  input: z.object({ task_id: z.string().min(1), patch: taskFields.partial().extend({ prompt: z.string().max(8000).optional() }) }),
  output: z.object({ task_id: z.string() }),
  permission: 'ai_task.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['ai-tasks'],
});

export const aiTaskPause = defineAction({
  id: 'ai_task.pause',
  module: 'ai',
  title: 'actions.ai_task.pause.title',
  description: 'Pause or resume an autonomous task. Example: {"task_id":"tk_1","paused":true}',
  input: z.object({ task_id: z.string().min(1), paused: z.boolean() }),
  output: z.object({ task_id: z.string(), active: z.boolean() }),
  permission: 'ai_task.manage',
  risk: 'config',
  agentGrantable: false,
  invalidates: ['ai-tasks'],
});

export const aiTranslate = defineAction({
  id: 'ai.translate',
  module: 'ai',
  title: 'actions.ai.translate.title',
  description: 'Translate a message to Vietnamese (mock: returns a fixed demo translation). Example: {"conversation_id":"c_lan","message_id":"m7"}',
  input: z.object({ conversation_id: z.string().min(1), message_id: z.string().min(1) }),
  output: z.object({ text: z.string() }),
  permission: 'inbox.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});
