// Cây GenUI đang stream (TIP-023c 6a "Structured tree stream"): input của tool `render` đến dần (tool-input delta của AI SDK) → parse JSON
// dở bằng `parsePartialJson` của SDK → KHUNG XƯƠNG: chỉ loại khối + độ sâu cho khối đã biết loại. Không mang chữ, `$ref`, nút, action_id
// hay giá trị form — khung xương không tương tác được, chỉ để hiện "đang dựng" đúng hình. Trần §8 giữ nguyên (sâu 4, 30 khối), loại lạ bị
// bỏ. Cây thật chỉ hiện sau khi server kiểm toàn cây (render.ts) — partial không bao giờ mở nút.
import { parsePartialJson } from 'ai';
import { GENUI_LIMITS } from '@appchat/shared';

/** Loại khối hiện được trong khung xương (danh sách đóng — standard §2). */
const BLOCKS = new Set(['stack', 'row', 'section', 'text', 'stat', 'stat_group', 'table', 'list', 'progress', 'badge', 'chart', 'button', 'button_group', 'form', 'qr']);
const CONTAINERS = new Set(['stack', 'row', 'section']);

export interface SkeletonNode {
  type: string;
  children?: SkeletonNode[];
}
export interface UiSkeleton {
  root: SkeletonNode;
  blocks: number;
}

type Raw = { type?: unknown; children?: unknown };

/** Khung xương từ một cây (có thể dở); chưa thấy loại gốc → null. */
export function skeletonOf(tree: unknown): UiSkeleton | null {
  let blocks = 0;
  const walk = (n: unknown, depth: number): SkeletonNode | null => {
    const r = (n ?? {}) as Raw;
    if (typeof r.type !== 'string' || !BLOCKS.has(r.type) || depth > GENUI_LIMITS.depth || blocks >= GENUI_LIMITS.blocks) return null;
    blocks++;
    if (!CONTAINERS.has(r.type)) return { type: r.type };
    const kids = Array.isArray(r.children) ? r.children.map((c) => walk(c, depth + 1)).filter((c): c is SkeletonNode => !!c) : [];
    return { type: r.type, children: kids };
  };
  const root = walk((tree as { root?: unknown } | null)?.root, 1);
  return root ? { root, blocks } : null;
}

const same = (a: UiSkeleton | null, b: UiSkeleton | null) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Bộ ghép input `render` theo từng tool call: `push(delta)` trả khung xương MỚI khi hình đổi (thêm khối / đổi loại), null khi không đổi —
 * để không phát mỗi ký tự. Input quá dài (> 64KiB) ngừng ghép.
 */
export class TreeSkeletonStream {
  private text = '';
  private last: UiSkeleton | null = null;
  private static readonly MAX = 64 * 1024;

  async push(delta: string): Promise<UiSkeleton | null> {
    if (this.text.length + delta.length > TreeSkeletonStream.MAX) return null;
    this.text += delta;
    const { value } = await parsePartialJson(this.text);
    const tree = (value as { tree?: unknown } | undefined)?.tree;
    const s = skeletonOf(tree);
    if (!s || same(s, this.last)) return null;
    this.last = s;
    return s;
  }
}
