// Tổng quan (Blueprint §7.2 dashboard): checklist onboarding + follow-up đến hạn. Prototype L1079–1177.
// Hai id chưa có trong Blueprint §3.4 — đề xuất bổ sung (Completion Report F2).
import { z } from 'zod';
import { defineAction } from './define';

export const onboardingToggleStep = defineAction({
  id: 'onboarding.toggle_step',
  module: 'identity',
  title: 'actions.onboarding.toggle_step.title',
  description: 'Mark a "Getting started" checklist step done / not done. Example: {"step":"channel","done":true}',
  input: z.object({ step: z.enum(['channel', 'ai', 'team', 'template', 'sla']), done: z.boolean() }),
  output: z.object({ done_count: z.number().int() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['dashboard'],
  db: 'platform',
});

export const followUpComplete = defineAction({
  id: 'follow_up.complete',
  module: 'crm',
  title: 'actions.follow_up.complete.title',
  description: 'Mark a due customer follow-up as done. Example: {"follow_up_id":"F1"}',
  input: z.object({ follow_up_id: z.string().min(1) }),
  output: z.object({ remaining: z.number().int() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['dashboard', 'calendar'],
});
