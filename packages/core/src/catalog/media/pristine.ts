// Hoàn tác tạo sản phẩm vs media (TIP-027b §2.3): hoàn tác xoá cứng sản phẩm nên chỉ được khi bộ media còn nguyên sơ — chưa từng gắn / gỡ /
// sắp xếp (`touched`), không ý định gắn đang chuẩn bị (chép bytes / kiểm cấu trúc) và không tệp nào đã giành cho sản phẩm. Khoá sản phẩm
// FOR UPDATE trước (cùng thứ tự khoá với gắn media) → gắn song song hoặc chờ, hoặc thấy sản phẩm đã xoá (404). Không xoá dây chuyền lineage.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export async function assertMediaPristine(tx: TenantTx, productId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM product WHERE id = ${productId}::uuid FOR UPDATE`;
  const [r] = await tx.$queryRaw<{ touched: boolean; intents: bigint; claims: bigint }[]>`
    SELECT COALESCE((SELECT touched OR version > 0 FROM product_media_state WHERE product_id = ${productId}::uuid), false) AS touched,
           (SELECT count(*) FROM product_media_intent WHERE product_id = ${productId}::uuid) AS intents,
           (SELECT count(*) FROM file_claim WHERE parent_type = 'product' AND parent_id = ${productId}::uuid) AS claims`;
  if (r && (r.touched || Number(r.intents) > 0 || Number(r.claims) > 0)) throw new AppError('HAS_DEPENDENCIES', 409, { product_id: 'has_media' });
}
