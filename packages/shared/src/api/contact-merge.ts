// Gộp / chống trùng khách (TIP-015e) — DTO dùng chung API / actions / web. Ứng viên trùng là gợi ý theo LUẬT (score_kind `rule`, hạng 1–4),
// không phải xác suất AI; bằng chứng chỉ là tên khoá khớp (không trả giá trị ẩn).
import { z } from 'zod';

export const duplicateSideSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  source: z.string(),
  created_at: z.string(),
  version: z.number().int(),
});

export const duplicateCandidateSchema = z.object({
  /** `<id nhỏ>~<id lớn>` — khoá cặp ổn định. */
  key: z.string(),
  score_kind: z.literal('rule'),
  /** 4 = email + tên, 3 = email, 2 = MST, 1 = tên. */
  rank: z.number().int().min(1).max(4),
  evidence: z.array(z.enum(['email', 'tax_code', 'name'])),
  /** Gợi ý bản chính (khách tạo trước) — người dùng chọn lại được. */
  primary_id: z.string(),
  a: duplicateSideSchema,
  b: duplicateSideSchema,
});
export type DuplicateCandidate = z.infer<typeof duplicateCandidateSchema>;
export const duplicateCandidatesPageSchema = z.object({ data: z.array(duplicateCandidateSchema), next_cursor: z.string().nullable() });
