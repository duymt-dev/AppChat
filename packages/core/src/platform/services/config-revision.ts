// Thế hệ cấu hình nền tảng (TIP-040, DC-370): thay đổi provider / route / giá tăng `platform_config_revision.generation` TRONG cùng
// transaction với thay đổi → sau commit mọi tiến trình (API, worker ROLE=ai / channels) thấy thế hệ mới ở lần đọc kế tiếp và nạp lại
// cache (ProviderStore / DbPriceBook) — không phụ thuộc TTL 60 giây cục bộ, không cần pub/sub (DB là nguồn sự thật).
// Nhóm route (tier, purpose) có phiên bản riêng `route:<tier>:<purpose>` cho CAS sắp xếp lại.
import type { PlatformDb } from '@appchat/db';
import type { PlatformTx } from '../../kernel/actions/action-context';

export const AI_CONFIG_SCOPE = 'ai';
export const routeScope = (tier: string, purpose: string) => `route:${tier}:${purpose}`;

/** Tăng thế hệ (tạo dòng nếu chưa có); khoá dòng tới hết transaction — hai admin sửa cùng lúc xếp hàng ở đây. */
export async function bumpRevision(tx: PlatformTx, scope: string, now: Date): Promise<bigint> {
  const r = await tx.platformConfigRevision.upsert({
    where: { scope },
    create: { scope, generation: 1n, updatedAt: now },
    update: { generation: { increment: 1n }, updatedAt: now },
    select: { generation: true },
  });
  return r.generation;
}

export async function readRevision(db: Pick<PlatformDb, 'platformConfigRevision'>, scope: string): Promise<bigint> {
  return (await db.platformConfigRevision.findUnique({ where: { scope }, select: { generation: true } }))?.generation ?? 0n;
}

/**
 * Bộ kiểm thế hệ cho cache tiến trình: đọc thế hệ tối đa mỗi `checkMs` (một câu SELECT theo khoá chính), thế hệ đổi → `stale()` true.
 * Thế hệ ghi vào snapshot là thế hệ đọc TRƯỚC khi nạp (`begin`) — lần nạp đang chạy dở mà thế hệ tăng thì lần kiểm sau vẫn thấy lệch
 * và nạp lại (không "hồi sinh" cấu hình cũ).
 */
export class RevisionWatch {
  private checkedAt = -Infinity;
  private seen: bigint | null = null;

  constructor(
    private readonly db: Pick<PlatformDb, 'platformConfigRevision'>,
    private readonly scope: string,
    private readonly now: () => number = Date.now,
    private readonly checkMs = 2_000,
  ) {}

  /** Thế hệ hiện tại ở DB (ghi nhớ làm mốc kiểm kế tiếp). */
  async begin(): Promise<bigint> {
    const g = await readRevision(this.db, this.scope);
    this.checkedAt = this.now();
    return g;
  }

  /** `loaded` = thế hệ của snapshot đang dùng; true khi DB đã có thế hệ khác. */
  async stale(loaded: bigint): Promise<boolean> {
    if (this.now() - this.checkedAt < this.checkMs && this.seen !== null) return this.seen !== loaded;
    this.seen = await readRevision(this.db, this.scope);
    this.checkedAt = this.now();
    return this.seen !== loaded;
  }
}
