// Sao chép tệp Trợ lý vào đơn / đề nghị (TIP-032d §3.3) — lõi trung lập ở kernel (TIP-027b dùng chung cho sản phẩm); ở đây chỉ còn tra
// liên kết sống cùng digest theo bảng của sales.
import type { TenantTx } from '../../kernel/actions/action-context';

export { copyArtifact, copyIdOf, locateSource, sourceFact, type ArtifactRef } from '../../kernel/files/artifact-copy';

/** Tệp của liên kết SỐNG trên cha có cùng digest (đã gắn bản sao của nguồn này) — gửi lại / model gọi lặp → biên nhận cũ, không chép thêm. */
export async function liveFileByDigest(tx: TenantTx, table: 'order_attachment' | 'invoice_attachment', parentId: string, digest: string): Promise<string | null> {
  const col = table === 'order_attachment' ? 'order_id' : 'invoice_id';
  const [row] = await tx.$queryRawUnsafe<{ file_id: string }[]>(
    `SELECT a.file_id FROM ${table} a JOIN file f ON f.id = a.file_id WHERE a.${col} = $1::uuid AND a.detached_at IS NULL AND f.sha256 = $2 ORDER BY a.created_at LIMIT 1`,
    parentId,
    digest,
  );
  return row?.file_id ?? null;
}
