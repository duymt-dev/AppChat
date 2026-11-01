// Trạng thái form "Tạo tác vụ tự chủ" (TIP-035): giá trị mặc định theo prototype (nhóm dữ liệu "Đơn hàng", công cụ "Đọc dữ liệu" +
// "Gửi kết quả cho tôi"), mẫu nhanh (mẫu chủ động mang theo cách chạy / nhóm dữ liệu / công cụ), dựng input `ai_task.create`.
'use client';
import { useState } from 'react';
import { AI_TASK_TEMPLATE_DEFS, type AiTaskTemplate } from '@appchat/shared';
import type { AiTasksPayload, Tier } from '../types';

export type Trigger = 'manual' | 'schedule' | 'event';
type Template = AiTasksPayload['templates'][number];

const initial = () => ({
  name: '',
  goal: '',
  department: 'Vận hành',
  data: ['orders'],
  tools: ['read', 'report'],
  trigger: 'manual' as Trigger,
  cron: '0 8 * * *',
  event: 'order.completed',
  agent: '',
  template: undefined as AiTaskTemplate | undefined,
  tier: 'standard' as Tier,
  askSend: true,
  budget: '2.000',
});
export type TaskForm = ReturnType<typeof initial>;

export function useTaskForm(prefill: unknown) {
  const [f, setF] = useState<TaskForm>(() => ({ ...initial(), ...(prefill as Partial<TaskForm>) }));
  const set = (p: Partial<TaskForm>) => setF((s) => ({ ...s, ...p }));
  const toggle = (k: 'data' | 'tools', v: string) => set({ [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  const pick = (tp: Template) => {
    const def = tp.template ? AI_TASK_TEMPLATE_DEFS[tp.template as AiTaskTemplate] : null;
    set({ name: tp.name, goal: tp.goal, department: tp.department, template: def ? (tp.template as AiTaskTemplate) : undefined, ...(def ? { trigger: 'schedule', cron: def.cron, data: [...def.data], tools: [...def.tools] } : {}) });
  };
  const input = () => ({
    name: f.name.trim(),
    goal: f.goal.trim(),
    department: f.department,
    trigger: f.trigger,
    ...(f.trigger === 'schedule' ? { cron: f.cron.trim() } : {}),
    ...(f.trigger === 'event' ? { event_type: f.event } : {}),
    ...(f.agent ? { agent_id: f.agent } : {}),
    ...(f.template ? { template: f.template } : {}),
    data_scope: f.data,
    tools: f.tools,
    model_tier: f.tier,
    ask_before_send: f.askSend,
    credit_limit_per_run: Number(f.budget.replace(/\D/g, '')) || 0,
  });
  return { f, set, toggle, pick, input, ok: !!(f.name.trim() && f.goal.trim()) };
}
