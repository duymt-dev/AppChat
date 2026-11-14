// Mẫu đã được chứng từ dùng chưa (TIP-028b §3 — hoàn tác `doc_template.create`): báo giá / hợp đồng / đề nghị thanh toán / phiếu thu
// ghi `template_id` lúc tạo (templates.md §2). Lần ký hợp đồng chụp mẫu từ chính hợp đồng nên không cần quét riêng. Mỗi bảng một EXISTS
// trên index partial `<bảng>_template_idx` (migration 20261112050000) — dừng ở bảng đầu tiên có dùng.
import type { TenantTx } from '../../kernel/actions/action-context';

export type TemplateUse = 'quote' | 'contract' | 'payment_request' | 'receipt';

export async function templateUsedBy(tx: TenantTx, templateId: string): Promise<TemplateUse | null> {
  const [r] = await tx.$queryRaw<{ used: TemplateUse | null }[]>`
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM quote WHERE template_id = ${templateId}::uuid) THEN 'quote'
      WHEN EXISTS (SELECT 1 FROM contract WHERE template_id = ${templateId}::uuid) THEN 'contract'
      WHEN EXISTS (SELECT 1 FROM invoice WHERE template_id = ${templateId}::uuid) THEN 'payment_request'
      WHEN EXISTS (SELECT 1 FROM customer_payment WHERE template_id = ${templateId}::uuid) THEN 'receipt'
    END AS used`;
  return r?.used ?? null;
}
