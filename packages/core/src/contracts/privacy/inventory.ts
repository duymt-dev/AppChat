// Kiểm kê Hợp đồng cho "Quên khách" (TIP-015c §2.3 hàng 10, DC-259): đã KÝ (status=signed) hoặc đang có hiệu lực pháp lý
// (pending_signature trở lên) = retained_issued; nháp (draft/pending_approval) = exclusive, xoá được.
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function contractsInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`
    SELECT 'contract' AS kind, id AS record_id, version AS revision, 'exclusive' AS ownership,
      (status IN ('pending_signature', 'signed')) AS retained_issued
      FROM contract WHERE contact_id = ANY(${ids})
    UNION ALL
    -- TIP-030c: biên nhận lần ký (chỉ digest / tham chiếu, không OTP / chữ ký thô) + ý định gửi OTP Owner của hợp đồng thuộc khách. Lần ký
    -- của hợp đồng đã phát hành / ký là chứng cứ giữ lại (DC-259); còn lại xoá được.
    SELECT 'contract_signing_attempt', a.id, 1, 'exclusive', (c.status IN ('pending_signature', 'signed'))
      FROM contract c JOIN contract_signing_attempt a ON a.contract_id = c.id WHERE c.contact_id = ANY(${ids})
    UNION ALL
    SELECT 'contract_signing_delivery', d.id, 1, 'exclusive', false
      FROM contract c JOIN contract_signer s ON s.contract_id = c.id JOIN contract_signing_delivery d ON d.signer_id = s.id WHERE c.contact_id = ANY(${ids})`;
  return toInventory(rows);
}
