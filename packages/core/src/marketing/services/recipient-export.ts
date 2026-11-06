// Xuất người nhận chiến dịch ra CSV (TIP-037, PRO-marketing-detailexport): chỉ người nhận mà khách nằm trong scope CRM HIỆN TẠI của người
// xuất (khách ngoài scope không ra dòng — kể cả khi chiến dịch có họ); lọc trạng thái như màn chi tiết. Ô bắt đầu bằng = + - @ chặn công
// thức (csvCell của CRM), BOM UTF-8 cho Excel. Tệp lưu kho (purpose `attachment` — `document` không nhận CSV) — tải qua /v1/files/:id có
// đăng nhập (chỉ người xuất / Owner).
import { TenantSql as Prisma } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { crmScopeSql } from '../../crm/public';
import { csvCell } from '../../crm/services/contact-export';

export const EXPORT_MAX = 50_000;
const BOM = '﻿';
const HEAD = ['Mã khách', 'Tên', 'Liên hệ', 'Trạng thái', 'Lý do loại', 'Kết quả gửi', 'Biến thể', 'Gửi lúc', 'Trả lời lúc'];
const iso = (d: Date | null) => (d ? d.toISOString() : '');

export async function exportRows(tx: Pick<TenantTx, '$queryRaw'>, authz: AuthzContext, campaignId: string, status?: string): Promise<{ csv: string; rows: number }> {
  const st = status && /^[a-z_]{1,20}$/.test(status) ? Prisma.sql`AND r.status = ${status}` : Prisma.empty;
  const rows = await tx.$queryRaw<{ code: string; name: string; endpoint: string; status: string; skip_reason: string | null; outcome: string | null; variant: string; sent_at: Date | null; replied_at: Date | null }[]>`
    SELECT c.code, c.name, r.endpoint, r.status, r.skip_reason, r.outcome, r.variant, r.sent_at, r.replied_at
    FROM campaign_recipient r JOIN contact c ON c.id = r.contact_id
    WHERE r.campaign_id = ${campaignId}::uuid ${st} AND c.deleted_at IS NULL AND ${crmScopeSql(authz)}
    ORDER BY r.id LIMIT ${EXPORT_MAX}`;
  const lines = rows.map((r) => [r.code, r.name, r.endpoint, r.status, r.skip_reason ?? '', r.outcome ?? '', r.variant, iso(r.sent_at), iso(r.replied_at)].map((v) => csvCell(String(v))).join(','));
  return { csv: BOM + [HEAD.join(','), ...lines].join('\r\n'), rows: rows.length };
}
