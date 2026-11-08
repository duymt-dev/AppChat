// Kỹ năng tiện ích AI chỉ đọc (TIP-019c §1): hợp đồng đầu vào / đầu ra dùng chung actions + core + web. Nguồn đúng một trong ba: chữ người
// gọi tự dán (không xác minh), tin chọn đích danh của một hội thoại (≤ 30), hoặc một khách (dữ kiện CRM có giới hạn). Không URL / đường dẫn
// tệp / truy vấn lồng. Đầu ra là ĐỀ XUẤT có bằng chứng (chunk + offset codepoint) — không bao giờ là lệnh hay hành động nghiệp vụ.
import { z } from 'zod';

export const UTILITY_SCHEMA_VERSION = 1;
export const UTILITY_ACTIONS = ['ai.summarize', 'ai.detect_intent', 'ai.extract_info', 'ai.score_lead'] as const;
export type UtilityActionId = (typeof UTILITY_ACTIONS)[number];

export const UTILITY_LIMITS = {
  textChars: 8000,
  sourceChars: 16_000,
  sourceBytes: 64 * 1024,
  messages: 30,
  modelJsonBytes: 32 * 1024,
  evidencePerResult: 10,
  evidencePerCriterion: 3,
  evidenceSpan: 300,
} as const;

const id = z.string().min(1).max(64);
const locale = z.enum(['vi', 'en']).optional();

export const utilitySourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string().min(1).max(UTILITY_LIMITS.textChars) }).strict(),
  z.object({ kind: z.literal('conversation'), conversation_id: id, message_ids: z.array(id).min(1).max(UTILITY_LIMITS.messages) }).strict(),
  z.object({ kind: z.literal('contact'), contact_id: id }).strict(),
]);
export type UtilitySource = z.infer<typeof utilitySourceSchema>;

const asciiKey = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/);
const label = z.string().trim().min(1).max(80);
const uniqueKeys = (xs: { key: string }[]) => new Set(xs.map((x) => x.key)).size === xs.length;

export const DEFAULT_INTENTS = ['inquiry', 'booking', 'purchase_interest', 'payment_question', 'complaint', 'cancellation', 'other'] as const;
export const intentTaxonomySchema = z
  .array(z.object({ key: asciiKey, label }).strict())
  .min(1)
  .max(20)
  .refine(uniqueKeys, { message: 'duplicate_key' });

export const EXTRACT_TYPES = ['string', 'number', 'boolean', 'date', 'enum', 'money'] as const;
export const extractFieldSchema = z
  .object({
    key: asciiKey,
    label,
    type: z.enum(EXTRACT_TYPES),
    required: z.boolean().optional(),
    values: z.array(label).min(1).max(20).optional(),
    currency: z.literal('VND').optional(),
  })
  .strict()
  .superRefine((f, c) => {
    if (f.type === 'enum' && !f.values) c.addIssue({ code: 'custom', path: ['values'], message: 'required' });
    if (f.type !== 'enum' && f.values) c.addIssue({ code: 'custom', path: ['values'], message: 'enum_only' });
    if (f.type === 'money' && f.currency !== 'VND') c.addIssue({ code: 'custom', path: ['currency'], message: 'vnd_only' });
    if (f.type !== 'money' && f.currency) c.addIssue({ code: 'custom', path: ['currency'], message: 'money_only' });
  });
export type ExtractField = z.infer<typeof extractFieldSchema>;

export const summarizeInput = z.object({ source: utilitySourceSchema, locale, max_bullets: z.number().int().min(1).max(10).optional() }).strict();
export const detectIntentInput = z.object({ source: utilitySourceSchema, locale, taxonomy: intentTaxonomySchema.optional() }).strict();
export const extractInfoInput = z
  .object({ source: utilitySourceSchema, locale, fields: z.array(extractFieldSchema).min(1).max(20).refine(uniqueKeys, { message: 'duplicate_key' }) })
  .strict();
/** score_lead: CHỈ dữ kiện server (khách + tin chọn của hội thoại thuộc khách) — không có chữ tự do khẳng định dữ kiện CRM. */
export const scoreLeadInput = z
  .object({ contact_id: id, conversation_id: id.optional(), message_ids: z.array(id).min(1).max(UTILITY_LIMITS.messages).optional(), locale })
  .strict()
  .refine((x) => !x.message_ids || !!x.conversation_id, { path: ['conversation_id'], message: 'required' });

// ── Đầu ra (sau khi server kiểm) ────────────────────────────────────────────────────────────────────────────────────────────────────
export const evidenceSchema = z.object({ chunk_id: z.string(), start: z.number().int().min(0), end: z.number().int().min(1), quote: z.string() }).strict();
export type Evidence = z.infer<typeof evidenceSchema>;

export const UTILITY_STATES = ['pending', 'completed', 'failed', 'unknown', 'invalidated', 'cancelled'] as const;
export const EXTRACT_STATUSES = ['extracted', 'missing', 'ambiguous', 'invalid'] as const;
export const EXTRACT_REASONS = [
  'missing_value', 'conflicting_values', 'currency_ambiguous', 'fractional_money', 'negative_money', 'amount_overflow', 'invalid_date', 'type_mismatch', 'evidence_missing',
] as const;
export const LEAD_CRITERIA = ['buying_intent', 'service_need', 'timing', 'engagement'] as const;
export const LEAD_RUBRIC_VERSION = 'lead-fit-v1';

const uncertainties = z.array(z.string().max(300)).max(5);
const evidenceList = z.array(evidenceSchema).max(UTILITY_LIMITS.evidencePerResult);
const extractedValue = z.union([z.string(), z.number(), z.boolean()]).nullable();

export const summarizeProposal = z.object({ summary: z.string().max(2000), bullets: z.array(z.string().max(300)).max(10), uncertainties, evidence: evidenceList }).strict();
export const detectIntentProposal = z
  .object({ label: z.string(), model_confidence: z.number().min(0).max(1).nullable(), uncertainties, evidence: evidenceList, taxonomy_version: z.string() })
  .strict();
export const extractInfoProposal = z
  .object({
    fields: z.array(
      z
        .object({
          key: z.string(),
          value: extractedValue,
          status: z.enum(EXTRACT_STATUSES),
          reason_code: z.enum(EXTRACT_REASONS).nullable(),
          alternatives: z.array(extractedValue).max(3).optional(),
          evidence: z.array(evidenceSchema).max(UTILITY_LIMITS.evidencePerCriterion),
        })
        .strict(),
    ),
    missing_required: z.array(z.string()),
    origin: z.enum(['caller_supplied', 'server']),
  })
  .strict();
export const scoreLeadProposal = z
  .object({
    rubric_version: z.string(),
    status: z.enum(['scored', 'insufficient_evidence']),
    score: z.number().int().min(0).max(100).nullable(),
    criteria: z.array(
      z.object({ key: z.enum(LEAD_CRITERIA), score: z.number().int().min(0).max(25).nullable(), reason: z.string().max(300).nullable(), evidence: z.array(evidenceSchema).max(3) }).strict(),
    ),
    uncertainties,
  })
  .strict();

export const utilityEnvelope = z.object({
  utility_run_id: z.string(),
  schema_version: z.number().int(),
  state: z.enum(UTILITY_STATES),
  proposal: z.unknown().optional(),
  reason: z.string().optional(),
});
export type UtilityEnvelope = z.infer<typeof utilityEnvelope>;
export type SummarizeProposal = z.infer<typeof summarizeProposal>;
export type DetectIntentProposal = z.infer<typeof detectIntentProposal>;
export type ExtractInfoProposal = z.infer<typeof extractInfoProposal>;
export type ScoreLeadProposal = z.infer<typeof scoreLeadProposal>;
