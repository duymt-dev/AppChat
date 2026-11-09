// Chặn công bố dữ liệu khách đã fence (TIP-015c §5.4) trước khi vật chất hoá cho model / export / provider. Pha 1: chặn đọc bằng
// isPrivacyFenced (guard.ts) TRƯỚC LIMIT ở SQL filter của người gọi — đây chỉ expose trợ giúp lọc mảng kết quả đã có id.
import type { TenantTx } from '../actions/action-context';
import { fencedContactIds } from './guard';

/** Lọc bỏ các hàng mà `contactIdOf(row)` đã bị fence — dùng SAU khi SQL đã lọc theo quyền, TRƯỚC khi trả ra model/API. */
export async function dropFenced<T>(tx: Pick<TenantTx, '$queryRaw'>, rows: readonly T[], contactIdOf: (row: T) => string | null | undefined): Promise<T[]> {
  const ids = [...new Set(rows.map(contactIdOf).filter((x): x is string => !!x))];
  if (!ids.length) return [...rows];
  const fenced = await fencedContactIds(tx, ids);
  return rows.filter((r) => {
    const id = contactIdOf(r);
    return !id || !fenced.has(id);
  });
}
