// Gia hạn hợp đồng T-30 trong "Việc cần tôi" (TIP-038 mục 3, AC06, COMMERCE §9): hợp đồng đã ký còn ≤ 30 ngày tới ngày kết thúc, trong
// scope sales của người xem (contractScopeSql). Đọc trực tiếp `end_date` — không phụ thuộc event `contract.expiring` (một lần / có thể bị dọn);
// xoá / hết hạn / đổi ngày kết thúc → việc tự hết hiệu lực. Nhắc T-30 vẫn do contracts.sweep (renew_notice_at) gửi một lần — không dựng lịch
// thứ hai. CTA mở Trợ lý với câu soạn đề xuất (nháp) — không tự gửi, không tự gia hạn.
import { CONTRACT_RENEW_NOTICE_DAYS, interpolate, serverMessages, utcToWall, type AuthzContext, type WorkItemDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { contractScopeSql, visibleContract } from '../../contracts/contract-access';

const DAY = 86_400_000;
const PER_SOURCE = 5;

export async function renewalItems(tx: Pick<TenantTx, '$queryRaw'>, a: AuthzContext, now: Date, place: { timeZone: string; locale: string }, perSource = PER_SOURCE): Promise<WorkItemDto[]> {
  const m = serverMessages(place.locale).insights.work;
  // `end_date` là cột date theo lịch workspace — so với hôm nay của workspace (mốc 00:00 UTC như contract-system).
  const today = new Date(`${utcToWall(now, place.timeZone).date}T00:00:00.000Z`);
  const until = new Date(today.getTime() + CONTRACT_RENEW_NOTICE_DAYS * DAY);
  const rows = await tx.$queryRaw<{ id: string; code: string; name: string; end: Date }[]>`
    SELECT c.id, c.code, k.name, c.end_date AS "end" FROM contract c JOIN contact k ON k.id = c.contact_id
    WHERE c.status = 'signed' AND c.deleted_at IS NULL AND c.end_date >= ${today} AND c.end_date <= ${until} AND ${contractScopeSql(a)}
    ORDER BY c.end_date, c.id LIMIT ${perSource}`;
  return rows.map((r) => ({
    id: r.id,
    type: 'contract_renewal' as const,
    title: `${r.code} · ${r.name}`,
    sub: interpolate(m.renewal, { n: Math.max(0, Math.round((r.end.getTime() - today.getTime()) / DAY)) }),
    due_at: r.end.toISOString(),
    route: `/contracts?open=${r.id}`,
    ask: interpolate(m.renewalAsk, { code: r.code, name: r.name }),
  }));
}

/** Tác vụ AI theo sự kiện hợp đồng (`contract.*`): người tạo tác vụ phải còn đọc được hợp đồng đó (scope hiện tại) mới được chạy. */
export async function eventRecordVisible(tx: TenantTx, commander: AuthzContext, payload: Record<string, unknown>): Promise<boolean> {
  const id = typeof payload.contract_id === 'string' ? payload.contract_id : null;
  if (!id) return true;
  return visibleContract(tx, commander, id).then(
    () => true,
    () => false,
  );
}
