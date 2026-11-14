// Không gian embedding + khe vector của kho tri thức (TIP-020e §1, DC-288). Space key = `provider:model:1536:<thế hệ route>` (023e §1.2,
// nửa route của thế hệ cấu hình — xoay key provider không đổi không gian vector). Hai khe đối xứng: khe A = cột `embedding` (+ space /
// generation A), khe B = `embedding_b`. Khe đang phục vụ = `kb_setting.active_slot`. Tên cột luôn lấy từ bảng hằng dưới đây (không bao giờ
// ghép từ input) nên `Prisma.raw` an toàn.
import { EMBED_DIM, type Embedder } from '@appchat/ai';
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';

export type Slot = 'a' | 'b';

export const otherSlot = (s: Slot): Slot => (s === 'a' ? 'b' : 'a');

/** Cột của một khe: vector, space key, generation đã ghi. */
export function slotCols(s: Slot) {
  return s === 'a'
    ? { vec: Prisma.raw('c.embedding'), space: Prisma.raw('c.embed_space_a'), gen: Prisma.raw('c.embed_generation_a'), vecW: Prisma.raw('embedding'), spaceW: Prisma.raw('embed_space_a'), genW: Prisma.raw('embed_generation_a') }
    : { vec: Prisma.raw('c.embedding_b'), space: Prisma.raw('c.embed_space_b'), gen: Prisma.raw('c.embed_generation_b'), vecW: Prisma.raw('embedding_b'), spaceW: Prisma.raw('embed_space_b'), genW: Prisma.raw('embed_generation_b') };
}

/** Space key từ kết quả embed; embedder giả cũ không báo space → `provider:model:1536:` (thế hệ trống — khớp theo provider + model). */
export const spaceOf = (e: { provider: string; model: string; space?: string }): string => e.space ?? `${e.provider}:${e.model}:${EMBED_DIM}:`;

/** Nhãn hiển thị: chỉ `provider · model` — không bao giờ lộ thế hệ cấu hình / key / URL. */
export function spaceLabel(space: string | null | undefined): string | null {
  if (!space) return null;
  const [provider, model] = space.split(':');
  return provider && model ? `${provider} · ${model}` : null;
}

/** Phần cố định `provider:model:1536:` của một space (so "cùng model" khi thế hệ route trống — kho trước 020e). */
const head = (space: string) => {
  const parts = space.split(':');
  return parts.length >= 3 ? `${parts[0]}:${parts[1]}:${parts[2]}:` : space;
};

/** Space đích có còn khớp space đã ghi không: nguyên văn, hoặc space cũ (thế hệ trống) cùng provider + model. */
export function sameSpace(stored: string | null | undefined, current: string | null | undefined): boolean {
  if (!stored || !current) return false;
  if (stored === current) return true;
  return stored === head(stored) && current.startsWith(stored);
}

export interface IndexSetting {
  activeSlot: Slot;
  activeGenerationId: string | null;
  activeSpace: string | null;
  indexState: 'current' | 'stale';
  version: number;
}

type Db = Pick<TenantDb, 'kbSetting'>;

/** Dòng setting (id = 1) — có sẵn từ migration 020e; DB cũ thiếu dòng → mặc định khe A, chưa gắn space. */
export async function readIndexSetting(db: Db): Promise<IndexSetting> {
  const s = await db.kbSetting.findUnique({ where: { id: 1 } });
  return {
    activeSlot: s?.activeSlot === 'b' ? 'b' : 'a',
    activeGenerationId: s?.activeGenerationId ?? null,
    activeSpace: s?.activeSpace ?? null,
    indexState: s?.indexState === 'stale' ? 'stale' : 'current',
    version: s?.version ?? 1,
  };
}

/** Embedder ghim space của khe đang phục vụ (câu hỏi tìm kiếm / nạp nguồn) — kho chưa có space → embedder gốc (lần nạp đầu gắn space). */
export async function kbSpaceEmbedder(db: Db, base: Embedder): Promise<Embedder> {
  const space = (await readIndexSetting(db)).activeSpace;
  return space ? { embed: (v, sig, hooks) => base.embed(v, sig, hooks, space) } : base;
}
