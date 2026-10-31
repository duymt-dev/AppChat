// Tin nhắn run (định dạng ModelMessage của AI SDK) — dựng phần tool-result, chạy tiếp sau khi dừng, đếm lời gọi tool cho loop guard.
import type { PausedState, RunMessage, ToolCallRef, ToolOutcome } from './types';

/** JSON an toàn (bigint → chuỗi, bỏ undefined) — lưu jsonb + gửi model. */
export const toJson = (v: unknown): unknown => (v === undefined ? null : JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))));

/** Khoá ổn định của một lời gọi (tên + input sắp khoá) — loop guard. */
export function callKey(name: string, input: unknown): string {
  const norm = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm((v as Record<string, unknown>)[k])])) : v;
  return `${name}:${JSON.stringify(norm(input))}`;
}

/** Kết quả tool → phần `tool-result` của AI SDK. Dừng chờ người không bao giờ tới model (engine dừng trước). */
export function resultPart(call: ToolCallRef, outcome: ToolOutcome): Record<string, unknown> {
  const value =
    outcome.kind === 'ok'
      ? toJson(outcome.output)
      : outcome.kind === 'error'
        ? { error: { code: outcome.code, message: outcome.message } }
        : { status: outcome.kind };
  return { type: 'tool-result', toolCallId: call.toolCallId, toolName: call.toolName, output: { type: 'json', value } };
}

/** Lời gọi bị bỏ qua vì run dừng ở tool trước nó — model được báo để gọi lại nếu cần. */
const SKIPPED: ToolOutcome = { kind: 'error', code: 'NOT_EXECUTED', message: 'Tool chưa chạy vì bước trước cần người xác nhận — gọi lại nếu vẫn cần.' };

/** Chạy tiếp sau khi người quyết: nối kết quả tool đang chờ (+ tool bị bỏ qua) vào tin. */
export function resumeMessages(state: PausedState, outcome: ToolOutcome): RunMessage[] {
  const parts = [...state.results, resultPart(state.pendingToolCall, outcome), ...state.skipped.map((c) => resultPart(c, SKIPPED))];
  return [...state.messages, { role: 'tool', content: parts }];
}

/** Đếm lời gọi tool đã có trong lịch sử (chạy tiếp vẫn giữ đếm cho loop guard). */
export function countCalls(messages: RunMessage[]): Map<string, number> {
  const n = new Map<string, number>();
  for (const m of messages) {
    if (m.role !== 'assistant' || !Array.isArray(m.content)) continue;
    for (const p of m.content as { type?: string; toolName?: string; input?: unknown }[]) {
      if (p.type !== 'tool-call' || !p.toolName) continue;
      const k = callKey(p.toolName, p.input);
      n.set(k, (n.get(k) ?? 0) + 1);
    }
  }
  return n;
}
