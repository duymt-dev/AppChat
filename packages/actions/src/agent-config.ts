// Cấu hình agent chuẩn (TIP-021b §1.1) — một nguồn duy nhất cho agent.create / create_and_publish / update / test và bản soạn AI.
import { z } from 'zod';
import { weeklyScheduleSchema } from '@appchat/shared';

export const agentTier = z.enum(['standard', 'advanced', 'max']);

/** Cấu hình agent = các cột bản nháp của `ai_agent` (Blueprint §2.2); xuất bản thì chụp thành `ai_agent_version`. */
export const agentConfig = z.object({
  name: z.string().trim().min(1).max(80),
  emoji: z.string().max(8).optional(),
  role: z.enum(['sales', 'cs', 'booking', 'marketing', 'accounting', 'ops', 'custom']).optional(),
  /** Nhãn vai trò hiển thị trên thẻ agent ("Tư vấn & chốt đơn") + tính cách — prototype L2280. */
  role_label: z.string().max(80).optional(),
  persona: z.string().max(500).optional(),
  language: z.enum(['vi', 'en', 'bilingual', 'auto']).optional(),
  prompt: z.string().max(8000).optional(),
  intents: z.array(z.number().int().min(0)).optional(),
  model_tier: agentTier.optional(),
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
  /** Lịch tuần có cấu trúc (TIP-022b) — múi IANA, 7 ngày (0 = Thứ Hai), ≤ 4 khoảng nửa mở / ngày; qua đêm tách hai ngày. */
  weekly_schedule: weeklyScheduleSchema.nullable().optional(),
});

