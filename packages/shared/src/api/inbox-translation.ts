// Dịch hai chiều trong Hộp thư (TIP-025b §F) — hằng dùng chung api ↔ web ↔ mock. Dịch tin vào: đích `vi`; dịch bản nháp: đích chọn rõ.
// Phiên bản prompt nằm trong khoá cache — đổi prompt dịch thì tăng để không dùng lại bản dịch cũ.
import { z } from 'zod';

export const TRANSLATE_TARGETS = ['vi', 'en', 'zh', 'ko', 'ja'] as const;
export type TranslateTarget = (typeof TRANSLATE_TARGETS)[number];
export const TRANSLATE_DRAFT_MAX = 4000;
/** Bật tự dịch: tối đa 10 tin vào đang thấy được dịch tự động; cũ hơn phải bấm "Dịch thêm". */
export const AUTO_TRANSLATE_INITIAL = 10;
export const TRANSLATION_PROMPT_VERSION = 'xl-1';
export const TRANSLATION_TTL_MS = 24 * 60 * 60_000;

export const draftTranslationSchema = z.object({
  text: z.string(),
  to: z.enum(TRANSLATE_TARGETS),
  draft_revision: z.number().int(),
  cached: z.boolean(),
});
export type DraftTranslationDto = z.infer<typeof draftTranslationSchema>;
