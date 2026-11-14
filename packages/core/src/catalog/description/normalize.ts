// Chuẩn hoá mô tả sản phẩm trước khi ghi (TIP-027b §2.2-2.3): một chỗ cho create / update / import. Quy tắc:
//   - có `description_doc` → kiểm schema đóng, dạng chuẩn; chữ thuần dẫn ra từ tài liệu. Có cả `description` mà khác phép chiếu → 422
//     (không tin chữ thuần model đưa);
//   - chỉ `description` → nếu bằng phép chiếu của tài liệu hiện có (client cũ gửi lại nguyên) thì GIỮ định dạng; khác → một đoạn mỗi dòng
//     (định dạng cũ reset — client cũ đã đổi chữ); rỗng → xoá cả hai;
//   - không gửi gì → giữ nguyên cả hai.
// Kết quả là cột Prisma (`description` + `descriptionDoc`) ghi cùng UPDATE có CAS version của sản phẩm.
import { TenantSql } from '@appchat/db';
import { AppError, canonicalDoc, descriptionDocSchema, descriptionText, docFromPlain, type DescriptionDoc } from '@appchat/shared';

export type DescriptionInput = { description?: string; description_doc?: unknown };
export type DescriptionColumns = { description?: string; descriptionDoc?: DescriptionDoc | typeof TenantSql.DbNull };
type Current = { description: string; descriptionDoc: unknown } | null;

/** Tài liệu hợp lệ (dạng chuẩn) hoặc 422 `description_doc: invalid` kèm lý do đầu tiên. */
export function parseDoc(raw: unknown): DescriptionDoc {
  const r = descriptionDocSchema.safeParse(raw);
  if (!r.success) throw new AppError('VALIDATION_FAILED', 422, { description_doc: r.error.issues[0]?.message?.match(/^[a-z_]+$/) ? r.error.issues[0]!.message : 'invalid' });
  return canonicalDoc(r.data);
}

/** Tài liệu hiện hành để đọc: cột có → tài liệu; cũ (null) → một đoạn mỗi dòng từ chữ thuần (chỉ để hiển thị / so sánh, không ghi lại). */
export function currentDoc(p: { description: string; descriptionDoc: unknown }): DescriptionDoc {
  const d = p.descriptionDoc ? descriptionDocSchema.safeParse(p.descriptionDoc) : null;
  return d?.success ? d.data : docFromPlain(p.description);
}

export function normalizeDescription(i: DescriptionInput, cur: Current): DescriptionColumns {
  const plain = i.description === undefined ? undefined : i.description.trim();
  if (i.description_doc !== undefined && i.description_doc !== null) {
    const doc = parseDoc(i.description_doc);
    const text = descriptionText(doc);
    if (plain !== undefined && plain !== text) throw new AppError('VALIDATION_FAILED', 422, { description: 'mismatch_doc' });
    return text ? { description: text, descriptionDoc: doc } : { description: '', descriptionDoc: TenantSql.DbNull };
  }
  if (i.description_doc === null) return { description: '', descriptionDoc: TenantSql.DbNull };
  if (plain === undefined) return {};
  if (!plain) return { description: '', descriptionDoc: TenantSql.DbNull };
  // Client cũ gửi lại đúng chữ đang hiển thị → giữ định dạng (không reset ngầm).
  if (cur && cur.descriptionDoc && plain === cur.description.trim()) return {};
  return { description: plain, descriptionDoc: docFromPlain(plain) };
}

/** Chữ thuần mới khác chữ của tài liệu hiện có → định dạng sẽ reset (nhập dữ liệu cảnh báo trước khi xác nhận). */
export const formattingReset = (plain: string | undefined, cur: Current): boolean => !!cur?.descriptionDoc && plain !== undefined && plain.trim() !== cur.description.trim();
