// Ảnh chụp giai đoạn của khách đọc trong SQL (TIP-015g §2.5): mốc kéo tay / lần tương tác cuối lấy dạng chữ UTC đủ 6 chữ số thập phân
// (không đi qua Date JS — mất micro giây), khôi phục bằng cast timestamptz có tham số. Dùng cho before / after + vân tay của hoàn tác.
import type { TenantTx } from '../../kernel/actions/action-context';

export interface StageSnap {
  stage: string;
  version: number;
  lifecycle_revision: number;
  manual_at: string | null;
  last_at: string;
}

/** Đọc dòng khách (người gọi đã khoá) — null = không thấy / đã xoá / đã gộp. */
export async function stageSnap(tx: Pick<TenantTx, '$queryRaw'>, id: string): Promise<StageSnap | null> {
  const rows = await tx.$queryRaw<StageSnap[]>`
    SELECT stage::text AS stage, version, lifecycle_revision,
           to_char(stage_set_manually_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS manual_at,
           to_char(last_interaction_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS last_at
      FROM contact WHERE id = ${id}::uuid AND deleted_at IS NULL AND merged_into_id IS NULL`;
  return rows[0] ?? null;
}

/** Vân tay các trường lần đổi tay chạm tới. */
export const fingerprint = (s: Pick<StageSnap, 'stage' | 'manual_at' | 'last_at'>) => ({ stage: s.stage, manual_at: s.manual_at, last_at: s.last_at });
