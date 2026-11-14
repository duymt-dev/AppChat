// Reader xuất liệu trình một khách (TIP-033b §5.1 — tập chỉ xuất `customer_packages`): chốt id bằng CHÍNH PackagesRead (khách thấy được theo
// CRM → 404, gói theo scope đơn trong SQL, họ khách gộp một lần), dựng dòng theo lô dưới quyền HIỆN TẠI (gói ra ngoài scope → bỏ). Không cột
// tiền / giá / thanh toán; "Còn lại" = chưa dùng, KHÔNG phải còn đặt được; trạng thái hết hạn / hoàn / hết buổi giữ nguyên. Ô chữ không công thức.
import { serverMessages } from '@appchat/shared';
import { packageExportIds, packageExportRows } from '../../sales/public';
import type { TenantTx } from '../../kernel/actions/action-context';
import { stamp } from './export-columns';
import type { Cell, ExportDb, ListReader } from './types';

type Filter = { contactId: string; status?: string };
const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

export const packageReader: ListReader<Filter> = {
  kind: 'package.export',
  entity: null,
  filter: (i) => ({ contactId: s(i.contact_id) ?? '', status: s(i.status) }),
  snapshot: (tx, a, f, cap) => packageExportIds(tx as unknown as TenantTx, a, { contactId: f.contactId, status: f.status, cap }),
  columns: (m) => [
    { key: 'id', header: m.col.recordId, width: 38 },
    { key: 'contactId', header: m.col.contact, width: 38 },
    { key: 'name', header: m.col.name, width: 32 },
    { key: 'total', header: m.col.sessionsTotal, width: 12 },
    { key: 'used', header: m.col.sessionsUsed, width: 12 },
    { key: 'remaining', header: m.col.sessionsLeft, width: 18 },
    { key: 'status', header: m.col.status },
    { key: 'expiresAt', header: m.col.expiresAt },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx: ExportDb, a, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const at = new Map(xs.map((id, i) => [id, i]));
    const got = (await packageExportRows(tx as unknown as TenantTx, a, xs)).sort((x, y) => at.get(x.dto.id)! - at.get(y.dto.id)!);
    const st = serverMessages(place.locale).insights.export.packageStatus;
    return {
      ids: got.map((r) => r.dto.id),
      rows: got.map(({ dto: p, createdAt }): Cell[] => [
        p.id,
        p.contact_id,
        p.name,
        p.total,
        p.used,
        p.remaining,
        st[p.status],
        p.expires_at ? stamp(new Date(p.expires_at), place.timeZone) : null,
        stamp(createdAt, place.timeZone),
      ]),
    };
  },
};
