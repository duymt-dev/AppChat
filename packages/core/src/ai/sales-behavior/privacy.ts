// Quyền riêng tư của biên nhận ý định khách (TIP-022c §4.2) — dữ liệu vận hành của khách theo 015c / 015f. "Quên khách": biên nhận còn
// `prepared` bị vô hiệu NGAY (không dùng tiếp, guard 409 privacy), rồi xoá liên kết riêng (tập tin nguồn, run phân loại, khách gốc, báo
// giá) — giữ id + khoá nguồn (source_message_id, revision) làm định danh chống phát lại tối thiểu: tin nguồn cũ không bao giờ thành căn cứ
// mới. Không chép chữ khách vào biên nhận (chữ phân loại / đoạn trích nằm ở bước run, xoá theo pha erase AI của 015c). Biên nhận đã dùng
// (consumed) giữ action_log_id — hiệu ứng báo giá là chứng từ thương mại theo chính sách lưu đã duyệt, không đổi.
import type { TenantTx } from '../../kernel/actions/action-context';

/** Vô hiệu + xoá liên kết riêng của một biên nhận. Gọi lại an toàn (idempotent). */
export async function eraseSalesIntent(tx: Pick<TenantTx, '$executeRaw'>, id: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE ai_sales_intent
       SET state = CASE WHEN state = 'prepared' THEN 'invalidated' ELSE state END,
           invalid_reason = CASE WHEN state = 'prepared' THEN 'privacy_erased' ELSE invalid_reason END,
           source_ids = ARRAY[source_message_id], source_digest = '', classifier_run_id = NULL, original_contact_id = NULL,
           quote_fingerprint = '', updated_at = now()
     WHERE id = ${id}::uuid`;
}
