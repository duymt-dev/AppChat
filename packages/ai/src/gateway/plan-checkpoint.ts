// Checkpoint dừng-để-sửa kế hoạch (TIP-023d §3.2): `RunHooks.planGate` trả `paused` khi người dùng đã yêu cầu sửa (plan_epoch đổi).
// Engine hỏi cổng TRƯỚC mỗi lời gọi model và TRƯỚC MỖI tool trong một batch nhiều lời gọi:
//   - kết quả các tool ĐÃ chạy trong batch giữ nguyên (không bao giờ chạy lại);
//   - các lời gọi chưa admit của revision cũ thành kết quả `superseded` có kiểu, đúng một lần — SDK luôn có đủ tool-result cho mọi
//     tool-call (transcript hợp lệ), bộ đếm bước / loop giữ nguyên;
//   - lời gọi model đã admit thì chạy xong + tính tiền; hành động nó đề xuất (cũ) không chạy.
// Chạy tiếp (plan_resume) nạp `messages` của checkpoint + một tin `user` mô tả kế hoạch mới — không phát lại batch đã xong.
import { resultPart } from './messages';
import type { PlanCheckpoint, RunMessage, ToolCallRef, ToolOutcome } from './types';

export type { PlanCheckpoint } from './types';

export const SUPERSEDED: ToolOutcome = { kind: 'error', code: 'PLAN_SUPERSEDED', message: 'Người dùng đang sửa kế hoạch — lời gọi này không chạy; đợi kế hoạch mới rồi làm theo bước hiện hành.' };

/** Đóng batch đang dở: kết quả đã có + `superseded` cho lời gọi còn lại → tin tool hợp lệ. */
export function checkpointBatch(messages: RunMessage[], results: Record<string, unknown>[], rest: readonly ToolCallRef[], stepIdx: number, epoch: number): PlanCheckpoint {
  const parts = [...results, ...rest.map((c) => resultPart(c, SUPERSEDED))];
  return {
    messages: parts.length ? [...messages, { role: 'tool', content: parts }] : [...messages],
    stepIdx,
    superseded: rest.map((c) => ({ toolCallId: c.toolCallId, toolName: c.toolName })),
    epoch,
  };
}

/** Tin nối khi chạy tiếp: kế hoạch đã sửa (chữ do server dựng từ revision hiện hành, không phải lời model). */
export function resumeFromCheckpoint(cp: PlanCheckpoint, planBrief: string): RunMessage[] {
  return [...cp.messages, { role: 'user', content: planBrief }];
}
