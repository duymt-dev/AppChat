// Schema dùng chung của chứng từ bán hàng (Báo giá / Đơn / Đề nghị thanh toán) — COMMERCE-DECISIONS §3–5. Không export qua registry.
import { z } from 'zod';

/** Tiền là string VND (Blueprint §4.1). */
export const money = z.string().regex(/^\d+$/);

/** Kênh gửi chứng từ cho khách (TIP-032b P2): Zalo cá nhân, email, website chat — webchat gửi tin + link xem / tải công khai có hạn. */
export const DOC_CHANNELS = ['zalo_personal', 'email', 'webchat'] as const;
export const docChannel = z.enum(DOC_CHANNELS);

export const discount = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pct'), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal('amount'), value: money }),
]);

/** Dòng chứng từ: đơn giá chưa VAT, thuế theo dòng, chiết khấu theo dòng (% hoặc số tiền). */
export const lineItem = z.object({
  product_id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  variant: z.string().max(120).optional(),
  qty: z.number().positive(),
  unit_price: money,
  tax_rate: z.union([z.literal(0), z.literal(5), z.literal(8), z.literal(10)]),
  discount: discount.nullable().optional(),
});

// AI soạn hợp đồng (TIP-030b F2, contract-draft.ts).
/** Dòng hàng đề xuất: giá luôn từ catalog (`product_id`); dòng ngoài catalog `off_catalog` + giá 0 — người dùng nhập. */
export const draftLine = z.object({ name: z.string(), qty: z.number(), unit_price: money, product_id: z.string().nullable(), off_catalog: z.boolean() });
export const draftSuggestion = z.object({ id: z.string(), text: z.string().max(2000) });

/**
 * Nguồn Hộp thư (TIP-025b §D.1) — chỉ ở lệnh tạo, không có trong `patch` sửa. Hội thoại phải thấy được + khách khớp (nhóm: khách chọn
 * rõ là thành viên đã liên kết); tin nguồn thuộc đúng hội thoại. Liên kết không cấp quyền chứng từ.
 */
export const sourceLink = z.object({
  conversation_id: z.string().optional(),
  source_message_id: z.string().optional(),
});
