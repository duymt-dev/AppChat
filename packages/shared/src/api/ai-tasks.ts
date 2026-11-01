// Màn Tác vụ tự chủ (Coworks — TIP-035, `GET /v1/ai-tasks`; FE `features/assistant/types.ts` AiTasksPayload). Giữ shape từ goal FE
// (thẻ tác vụ: lượt chạy 24h, tỉ lệ thành công, credit hôm nay, ngưỡng bàn giao) + cấu hình thật (cách chạy, agent, nhóm dữ liệu /
// công cụ). `drawer` theo tác vụ: prompt, công cụ của agent (chỉ xem — D51), kiến thức, nhật ký lượt chạy.
import { z } from 'zod';
import { AI_TIERS } from './ai';

const tier = z.enum(AI_TIERS);

export const aiTaskRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Mục tiêu rút gọn (dòng phụ trên thẻ). */
  role: z.string(),
  goal: z.string(),
  prompt: z.string(),
  runs: z.number().int(),
  success: z.string(),
  cost: z.string(),
  active: z.boolean(),
  model_tier: tier,
  department: z.string(),
  channels: z.array(z.string()),
  conf: z.number().int().min(0).max(100),
  trigger: z.enum(['manual', 'schedule', 'event']),
  cron: z.string().nullable(),
  event_type: z.string().nullable(),
  template: z.string().nullable(),
  agent_id: z.string().nullable(),
  agent_name: z.string(),
  data_scope: z.array(z.string()),
  tools: z.array(z.string()),
  ask_before_send: z.boolean(),
  credit_limit_per_run: z.number().int(),
  next_run_at: z.string().nullable(),
  last_run_at: z.string().nullable(),
});
export type AiTaskRowDto = z.infer<typeof aiTaskRowSchema>;

const drawerSchema = z.object({
  prompt: z.string(),
  tokens: z.string(),
  tools: z.array(z.object({ label: z.string(), on: z.boolean() })),
  knowledge: z.array(z.object({ label: z.string(), meta: z.string(), on: z.boolean() })),
  logs: z.array(z.object({ time: z.string(), text: z.string(), color: z.string() })),
});

export const aiTasksPayloadSchema = z.object({
  tasks: z.array(aiTaskRowSchema),
  stats: z.array(z.object({ key: z.string(), color: z.string(), icon: z.string(), value: z.string() })),
  templates: z.array(z.object({ label: z.string(), name: z.string(), goal: z.string(), department: z.string(), template: z.string().optional() })),
  departments: z.array(z.object({ key: z.string(), bg: z.string(), fg: z.string() })),
  data_options: z.array(z.string()),
  tool_options: z.array(z.string()),
  /** Agent đang chạy chọn được làm người thực hiện (rỗng → tác vụ chỉ chạy mẫu bản tin sáng). */
  agents: z.array(z.object({ id: z.string(), name: z.string() })),
  /** Drawer theo từng tác vụ (key = id tác vụ). */
  drawers: z.record(z.string(), drawerSchema),
  /** Bản drawer mặc định (tác vụ chưa có dữ liệu) — tương thích FE cũ. */
  drawer: drawerSchema,
});
export type AiTasksPayloadDto = z.infer<typeof aiTasksPayloadSchema>;
