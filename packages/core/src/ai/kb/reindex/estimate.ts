// Ước tính một lần tái tạo chỉ mục (TIP-020e §2.2): số đoạn còn hiệu lực, tổng `token_count` đã lưu, Credit theo đơn giá HIỆN HÀNH của model
// đích (công thức pricebook có sẵn `creditsFor` — không đơn giá mới, DC-303), dung lượng vector thêm (1536 × 4 byte mỗi đoạn). Chỉ đọc —
// không gọi provider. Token thật do nhà cung cấp báo có thể lệch nhẹ; Credit thật tính theo usage thật (019b).
import { EMBED_DIM } from '@appchat/ai';
import { creditsFor } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { ModelPrice } from '../../../billing/services/credit-meter';
import { LIVE_SOURCE } from './publish';

export interface ReindexEstimate {
  chunks: number;
  tokens: number;
  /** null = model đích chưa có đơn giá (không cho chạy — thiếu giá là lỗi trước khi gọi provider). */
  credits: number | null;
  bytes: number;
}

export async function estimateReindex(db: Pick<TenantDb, '$queryRaw'>, price: ModelPrice | null): Promise<ReindexEstimate> {
  const [r] = await db.$queryRaw<{ n: bigint; t: bigint | null }[]>`
    SELECT count(*) AS n, sum(c.token_count) AS t FROM kb_chunk c JOIN kb_source s ON s.id = c.source_id WHERE ${LIVE_SOURCE}`;
  const chunks = Number(r?.n ?? 0);
  const tokens = Number(r?.t ?? 0);
  return { chunks, tokens, credits: price ? creditsFor(tokens, 0, price) : null, bytes: chunks * EMBED_DIM * 4 };
}

/** Dung lượng dễ đọc (KB / MB) cho thẻ xác nhận. */
export function fmtBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
