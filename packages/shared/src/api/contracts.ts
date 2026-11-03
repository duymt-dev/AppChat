// Shape đọc domain hợp đồng (FE ↔ BE — gap-filling §5, TIP-030): GET /v1/contracts (D42), /contracts/:id, /contracts/meta
// (?contract_id=), trang ký công khai /public/sign/:token (+ /otp · /sign · /decline). Mock transport (apps/web) và API thật parse
// cùng schema. Tiền là string VND; ngày hiệu lực là `YYYY-MM-DD` (date).
import { z } from 'zod';
import { customValuesSchema } from '../custom-fields/values';
import { CONTRACT_KINDS, CONTRACT_STATUSES } from '../contracts/contract-state';

export const signEventSchema = z.object({
  type: z.string(),
  at: z.string(),
  actor: z.string(),
  ip: z.string().optional(),
  doc_sha256: z.string().optional(),
});

export const contractRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  number: z.string(),
  kind: z.enum(CONTRACT_KINDS),
  contact_id: z.string(),
  contact_name: z.string(),
  phone: z.string(),
  quote_id: z.string().nullable(),
  quote_code: z.string(),
  title: z.string(),
  value: z.string(),
  signed_date: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  owner_user_id: z.string(),
  owner_name: z.string(),
  status: z.enum(CONTRACT_STATUSES),
  created_at: z.string(),
  sent_at: z.string().nullable(),
  signed_by_customer_at: z.string().nullable(),
  /** Token link ký đang hiệu lực (chỉ khi chờ khách ký) — người nội bộ sao chép / mở link. */
  sign_token: z.string().nullable(),
  sign_link_expires_at: z.string().nullable(),
  signed_sha256: z.string().nullable(),
  renewal_of_id: z.string().nullable(),
  terminated_reason: z.string(),
  note: z.string(),
  file_name: z.string(),
  /** Nguồn nội dung ký (TIP-030b): `template` | `file` (PDF / DOCX tải lên — hash bytes gốc bất biến). */
  source: z.enum(['template', 'file']).default('template'),
  source_hash: z.string().nullable().default(null),
  source_version: z.number().int().default(1),
  origin_message_id: z.string().nullable().default(null),
  events: z.array(signEventSchema),
  ai: z.object({ hint: z.string(), wait: z.boolean() }),
  custom: customValuesSchema.optional(),
});
export type ContractRow = z.infer<typeof contractRowSchema>;

export const contractsPageSchema = z.object({
  data: z.array(contractRowSchema),
  next_cursor: z.string().nullable(),
  meta: z.object({ total: z.number().int(), page: z.number().int(), limit: z.number().int() }),
});

export const contractsMetaSchema = z.object({
  counts: z.record(z.string(), z.number().int()),
  stats: z.object({ total: z.number().int(), signed: z.number().int(), pending: z.number().int(), active_value: z.string() }),
  crm: z.object({
    ltv: z.string(),
    total: z.number().int(),
    tier: z.string(),
    debt: z.string(),
    others: z.array(z.object({ code: z.string(), title: z.string(), value: z.string() })),
  }),
  insight: z.string(),
  suggestions: z.array(z.string()),
  files: z.array(z.object({ name: z.string(), ext: z.string(), by: z.string(), at: z.string(), size: z.string() })),
  ai_runs: z.record(z.string(), z.string()),
});

/** Trang ký công khai — không có dữ liệu nội bộ (ghi chú, người phụ trách, sự kiện nội bộ). */
export const signViewSchema = z.object({
  code: z.string(),
  title: z.string(),
  kind: z.enum(CONTRACT_KINDS),
  value: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  customer: z.object({ name: z.string(), phone: z.string() }),
  business: z.object({ name: z.string(), signed: z.boolean() }),
  status: z.enum(CONTRACT_STATUSES),
  expires_at: z.string().nullable(),
  signed_at: z.string().nullable(),
  sha256: z.string().nullable(),
  otp_left: z.number().int(),
  certificate: z.array(signEventSchema),
  /** Có PDF xem / tải (`GET /public/sign/:token/pdf`). */
  pdf: z.boolean().optional(),
});
export type SignView = z.infer<typeof signViewSchema>;
