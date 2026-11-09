// Dựng lại ĐÚNG validator theo action id từ `validateParams` đã lưu lúc sinh (TIP-019c §3.7, lát khôi phục) — không gọi lại model,
// không bịa tham số. File riêng (không ở `utility.handlers.ts`) để `runtime.providers.ts` dùng được mà không tạo vòng import qua
// `AiRunner`/`runner.ts` (handlers kéo theo toàn bộ máy chạy model, registry khôi phục chỉ cần 4 validator thuần).
import { DEFAULT_INTENTS, validateExtract, validateIntent, validateLead, validateSummarize, type ExtractField } from '@appchat/shared';
import type { SourceChunk } from './sources/types';

/**
 * `origin` của extract_info luôn 'server' ở đường khôi phục: chữ dán (`caller_supplied`) không có `refs` nên không bao giờ tới được
 * đây — `currentChunks` trả null trước khi gọi validator (xem `utility-revalidate.ts`).
 */
export function utilityValidatorOf(actionId: string, params: Record<string, unknown>): ((raw: unknown, chunks: SourceChunk[]) => unknown) | null {
  switch (actionId) {
    case 'ai.summarize':
      return (raw, chunks) => validateSummarize(raw, chunks, (params.max_bullets as number | undefined) ?? 5);
    case 'ai.detect_intent':
      return (raw, chunks) => validateIntent(raw, chunks, (params.keys as string[] | undefined) ?? [...DEFAULT_INTENTS], (params.version as string | undefined) ?? 'default-v1');
    case 'ai.extract_info':
      return (raw, chunks) => validateExtract(raw, chunks, (params.fields as ExtractField[] | undefined) ?? [], 'server');
    case 'ai.score_lead':
      return (raw, chunks) => validateLead(raw, chunks);
    default:
      return null;
  }
}
