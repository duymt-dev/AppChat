// Phụ lục hợp đồng (TIP-030b F3 spec 17–18): `GET /v1/contracts/:id/appendices` (tab Phụ lục — trạng thái, version, chứng cứ ký riêng của
// từng phụ lục) và trang ký công khai phụ lục `GET /v1/public/appendix-sign/:token` (không dữ liệu nội bộ).
import { z } from 'zod';
import { CONTRACT_STATUSES } from '../contracts/contract-state';
import { signEventSchema } from './contracts';

export const appendixEventSchema = z.object({
  type: z.string(),
  at: z.string(),
  actor: z.string(),
  party: z.string().nullable(),
  version: z.number().int(),
  doc_sha256: z.string().nullable(),
});

export const appendixSchema = z.object({
  id: z.string(),
  contract_id: z.string(),
  code: z.string(),
  seq: z.number().int(),
  title: z.string(),
  content: z.string().nullable(),
  status: z.enum(CONTRACT_STATUSES),
  version: z.number().int(),
  /** VND có dấu (điều chỉnh) — chỉ là thoả thuận, không đổi đơn / hoá đơn. */
  value_delta: z.string().nullable(),
  source: z.enum(['template', 'file']),
  source_name: z.string().nullable(),
  note: z.string(),
  sent_channel: z.string().nullable(),
  sign_link_expires_at: z.string().nullable(),
  signed_by_business_at: z.string().nullable(),
  signed_by_customer_at: z.string().nullable(),
  file_sha256: z.string().nullable(),
  signed_sha256: z.string().nullable(),
  /** Có PDF để mở (đóng băng / đã ký). */
  pdf: z.boolean(),
  declined_reason: z.string(),
  created_at: z.string(),
  events: z.array(appendixEventSchema),
});
export type Appendix = z.infer<typeof appendixSchema>;
export const appendicesSchema = z.object({ data: z.array(appendixSchema) });

/** Trang ký công khai phụ lục — gắn đúng phụ lục + version của link; hợp đồng cha chỉ hiện mã / tiêu đề. */
export const appendixSignViewSchema = z.object({
  code: z.string(),
  title: z.string(),
  contract: z.object({ code: z.string(), title: z.string() }),
  content: z.string().nullable(),
  value_delta: z.string().nullable(),
  version: z.number().int(),
  customer: z.object({ name: z.string(), phone: z.string() }),
  business: z.object({ name: z.string(), signed: z.boolean() }),
  status: z.enum(CONTRACT_STATUSES),
  expires_at: z.string().nullable(),
  signed_at: z.string().nullable(),
  sha256: z.string().nullable(),
  otp_left: z.number().int(),
  certificate: z.array(signEventSchema),
  pdf: z.boolean(),
});
export type AppendixSignView = z.infer<typeof appendixSignViewSchema>;
