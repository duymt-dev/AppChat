// Kế hoạch Cowork phiên bản hoá (TIP-023d §1.3): assistant.use + sở hữu phiên/run hiện hành, không cấp quyền mới, không agentGrantable
// (model không tự propose/edit/resume thay người — plan là điều phối của CHÍNH người dùng qua Trợ lý, không phải việc giao cho agent).
// Pha 1: propose (tạo plan draft mới, chốt ngay ở revision 1) + get (đọc projected status) + reusable (gợi ý tái dùng, top N, chỉ cấu
// trúc chung — không giá trị/receipt). plan_update/plan_resume/plan_request_edit/plan_reuse (ghi) thêm ở pha sau (§3, §4).
import { z } from 'zod';
import { defineAction } from './define';
import { PLAN_INSTRUCTIONS_MAX, PLAN_MAX_DEPENDS, PLAN_MAX_STEPS, PLAN_TITLE_MAX } from '@appchat/shared';

const uuid = z.string().uuid();
const planStepInput = z.object({
  kind: z.enum(['action', 'delegate', 'analysis']),
  title: z.string().min(1).max(PLAN_TITLE_MAX),
  instructions: z.string().max(PLAN_INSTRUCTIONS_MAX),
  action_or_agent_id: z.string().optional(),
  depends_on: z.array(z.string()).max(PLAN_MAX_DEPENDS).optional(),
});

export const assistantPlanPropose = defineAction({
  id: 'assistant.plan_propose',
  module: 'ai',
  title: 'actions.assistant.plan_propose.title',
  description:
    'Propose a new multi-step Cowork plan (1-12 steps) for the current session. Each step is kind action|delegate|analysis with a title and instructions; dependencies reference earlier step positions. Creates a fresh draft plan at revision 1 — does not execute anything. Example: {"session_id":"0190f000-0000-7000-8000-000000000010","steps":[{"kind":"action","title":"Tạo báo giá","instructions":"Soạn báo giá HIFU 10 buổi cho khách"}]}',
  input: z.object({ session_id: uuid, steps: z.array(planStepInput).min(1).max(PLAN_MAX_STEPS) }),
  output: z.object({ plan_id: z.string(), revision: z.number().int(), phase: z.string() }),
  permission: 'assistant.use',
  risk: 'write',
  agentGrantable: false,
  invalidates: [],
});

export const assistantPlanGet = defineAction({
  id: 'assistant.plan_get',
  module: 'ai',
  title: 'actions.assistant.plan_get.title',
  description: 'Read the current projected status of a Cowork plan (revision, phase, steps with real progress) owned by the current user. Example: {"plan_id":"0190f000-0000-7000-8000-000000000011"}',
  input: z.object({ plan_id: uuid }),
  output: z.object({
    id: z.string(),
    session_id: z.string(),
    root_run_id: z.string().nullable(),
    revision: z.number().int(),
    plan_epoch: z.number().int(),
    phase: z.string(),
    selected_agent_id: z.string().nullable(),
    source_plan_id: z.string().nullable(),
    steps: z.array(z.object({ id: z.string(), position: z.number().int(), kind: z.string(), title: z.string(), instructions: z.string(), action_or_agent_id: z.string().nullable(), depends_on: z.array(z.string()), state: z.string() })),
    progress: z.number(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
  permission: 'assistant.use',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const assistantPlanReusable = defineAction({
  id: 'assistant.plan_reusable',
  module: 'ai',
  title: 'actions.assistant.plan_reusable.title',
  description: 'List up to N safe-to-reuse plan structures from the current user own prior plans — generic registry labels only, no record ids/values/results. Example: {"limit":3}',
  input: z.object({ limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ candidates: z.array(z.object({ id: z.string(), source_plan_id: z.string(), source_revision: z.number().int(), generic_title: z.string(), step_count: z.number().int() })) }),
  permission: 'assistant.use',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
