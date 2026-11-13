// Kiểm kê AI cho "Quên khách" (TIP-015c §2.3 hàng 5): AI Run/Step/Assistant message gắn qua conversation_id → join conversation.contact_id.
// Chỉ hội thoại TRỰC TIẾP của khách tính exclusive (nhóm → shared, nhất quán với inbox/privacy/inventory.ts).
// TIP-021b: binding soạn agent theo dòng dõi run (run soạn → gốc → hội thoại của khách) — mô tả có thể chứa dữ liệu khách.
// TIP-023g: đề xuất theo bản ghi chỉ có ở sản phẩm (không dữ liệu khách) — không vào kiểm kê khách; việc theo khách đi qua lượt Trợ lý thường.
// TIP-023d: kế hoạch Cowork gắn phiên Trợ lý của NGƯỜI DÙNG (không gắn hội thoại / khách) — không có khoá join tới khách. Ứng viên tái dùng
// chỉ giữ cấu trúc chung (action id + nhãn registry), không chữ riêng / id bản ghi — không vào kiểm kê khách. Chữ riêng của bước (title /
// instructions người tự gõ) là văn bản người dùng, như tin nhắn phiên Trợ lý — Q-065 (đề xuất: xử lý cùng lớp xoá phiên Trợ lý).
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function aiInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`
    SELECT 'ai_run' AS kind, r.id AS record_id, 1 AS revision, CASE WHEN c.kind = 'direct' THEN 'exclusive' ELSE 'shared' END AS ownership
      FROM ai_run r JOIN conversation c ON c.id = r.conversation_id
      WHERE c.contact_id = ANY(${ids})
    UNION ALL
    SELECT 'agent_draft_publication' AS kind, b.id AS record_id, b.validation_generation AS revision,
           CASE WHEN c.kind = 'direct' THEN 'exclusive' ELSE 'shared' END AS ownership
      FROM agent_draft_publication b JOIN ai_run r ON r.id = b.run_id JOIN ai_run root ON root.id = r.root_run_id
      JOIN conversation c ON c.id = root.conversation_id
      WHERE c.contact_id = ANY(${ids})`;
  return toInventory(rows);
}
