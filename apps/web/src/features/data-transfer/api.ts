// Đọc nhập dữ liệu (TIP-038b): `GET /data-transfer/capabilities` · `/plans/:id` · `/plans/:id/rows` (chỉ kế hoạch của chính mình). Ghi là
// action `transfer.*` qua useAction (hook useTransfer) — không có đường ghi thứ hai.
import { queryOptions } from '@tanstack/react-query';
import type { TransferCapabilityDto } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import type { TransferPlanDto, TransferRowDto } from './types';

type RowsPage = { data: TransferRowDto[]; next_cursor: string | null };
export type RowCheck = TransferRowDto['check'];

/** Số dòng xem trước mỗi lần (server tối đa 100). */
export const PREVIEW_LIMIT = 50;

export const transferCapsQuery = () =>
  queryOptions({ queryKey: ['data-transfer', 'caps'], queryFn: () => transport.get<TransferCapabilityDto[]>('/data-transfer/capabilities'), staleTime: 60_000 });

export const transferPlanQuery = (id: string | null) =>
  queryOptions({
    queryKey: ['data-transfer', 'plan', id],
    queryFn: () => transport.get<TransferPlanDto>(`/data-transfer/plans/${id}`),
    enabled: !!id,
    // Đang ghi nền → theo dõi tới khi xong (counts thật từ receipts).
    refetchInterval: (q) => (q.state.data?.status === 'committing' ? 2000 : false),
  });

/** `version` trong key: sửa ánh xạ → đọc lại dòng đã kiểm lại. */
export const transferRowsQuery = (id: string | null, check: RowCheck | null, version = 0) =>
  queryOptions({
    queryKey: ['data-transfer', 'rows', id, check, version],
    queryFn: () => transport.get<RowsPage>(`/data-transfer/plans/${id}/rows`, { limit: PREVIEW_LIMIT, ...(check ? { check } : {}) }),
    enabled: !!id,
  });

/** Mọi dòng lỗi (theo trang keyset) — để dựng tệp lỗi tải về. */
export async function allInvalidRows(id: string): Promise<TransferRowDto[]> {
  const out: TransferRowDto[] = [];
  let cursor: string | null = null;
  do {
    const page: RowsPage = await transport.get<RowsPage>(`/data-transfer/plans/${id}/rows`, { check: 'invalid', limit: 100, ...(cursor ? { cursor } : {}) });
    out.push(...page.data);
    cursor = page.next_cursor;
  } while (cursor);
  return out;
}
