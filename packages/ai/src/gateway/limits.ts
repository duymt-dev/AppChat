// Giới hạn tài nguyên mỗi lời gọi model (TIP-019b §1.4) — không phải ước tính tiền. Trần chữ ra mặc định 2048, tối đa 8192; request
// (system + tin + schema tool) tối đa 256 KiB UTF-8 — vượt thì từ chối có lý do, không âm thầm cắt hướng dẫn.
import type { RunMessage, ToolSpec } from './types';

export const OUTPUT_TOKENS_DEFAULT = 2048;
export const OUTPUT_TOKENS_MAX = 8192;
export const REQUEST_MAX_BYTES = 256 * 1024;

export const outputTokens = (n?: number) => Math.min(OUTPUT_TOKENS_MAX, Math.max(1, Math.floor(n ?? OUTPUT_TOKENS_DEFAULT)));

/** Số byte UTF-8 của request sẽ gửi (đúng thứ tự gửi: system, tin, mô tả + schema tool). */
export function requestBytes(system: string, messages: RunMessage[], tools: ToolSpec[]): number {
  const body = JSON.stringify({ system, messages, tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
  return Buffer.byteLength(body, 'utf8');
}
