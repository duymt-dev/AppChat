// Agent có được tự trả lời lúc này (TIP-022b A): GIAO của lịch tài khoản kênh (chỉ lịch có cấu trúc đã lưu — chữ "hours" tự do cũ chỉ là
// ngữ cảnh) và lịch phiên bản agent đang chạy. Tạm dừng / xoá / thu hồi kiểm riêng (publishedAgent / currentAuthority). Ngoài giờ: không
// gọi model, không trừ credit, không gửi — hội thoại chờ nhân viên kèm lý do an toàn + mốc mở kế tiếp. Chạy tiếp sau duyệt kiểm lại theo
// THỜI ĐIỂM trước khi gửi (không theo lúc job bắt đầu).
import { inSchedule, nextOpening, type WeeklySchedule } from '@appchat/shared';
import type { AgentConfig } from '../agents/agent.store';
import { agentSchedule } from '../agents/schedule-config';

export interface Availability {
  open: boolean;
  /** Lịch đóng (tài khoản / agent) — hiển thị cho nhân viên; null khi đang mở. */
  closedBy: 'account' | 'agent' | null;
  next: { weekday: number; at: string } | null;
}

export function availability(cfg: Pick<AgentConfig, 'working_hours' | 'weekly_schedule'>, account: WeeklySchedule | null, now: Date): Availability {
  const agent = agentSchedule(cfg);
  if (account && !inSchedule(account, now)) return { open: false, closedBy: 'account', next: nextOpening(account, now) };
  if (agent && !inSchedule(agent, now)) return { open: false, closedBy: 'agent', next: nextOpening(agent, now) };
  return { open: true, closedBy: null, next: null };
}
