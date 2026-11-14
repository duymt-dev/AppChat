// Mô tả sản phẩm có định dạng (TIP-027b §2.1): schema ĐÓNG, có phiên bản — dùng chung web / actions / core. Chỉ đoạn văn, danh sách chấm /
// số (phẳng — mục danh sách chỉ chứa chữ) và nút chữ với dấu đậm / nghiêng / gạch chân. Không link / ảnh / HTML / style / thuộc tính tuỳ ý /
// tham chiếu ngoài. Giới hạn: ≤ 32 KiB JSON, ≤ 200 nút, sâu ≤ 4 (gốc = 0), văn bản thuần ≤ 4000 ký tự. Phép chiếu văn bản thuần tất định
// (đoạn / mục cách nhau bằng xuống dòng) là `product.description` cho API cũ / tìm kiếm / KB / xuất — không diễn giải markup từ chữ.
import { z } from 'zod';

export const DESCRIPTION_DOC_VERSION = 1;
export const DESCRIPTION_LIMITS = { bytes: 32 * 1024, nodes: 200, depth: 4, text: 4000 } as const;

const MARKS = ['bold', 'italic', 'underline'] as const;
export type DescriptionMark = (typeof MARKS)[number];

const textNode = z
  .object({
    type: z.literal('text'),
    text: z.string().min(1).max(DESCRIPTION_LIMITS.text),
    marks: z.array(z.enum(MARKS)).max(3).optional(),
  })
  .strict();
const paragraph = z.object({ type: z.literal('paragraph'), content: z.array(textNode).max(DESCRIPTION_LIMITS.nodes).optional() }).strict();
const listItem = z.object({ type: z.literal('list_item'), content: z.array(textNode).max(DESCRIPTION_LIMITS.nodes).optional() }).strict();
const list = (t: 'bullet_list' | 'ordered_list') => z.object({ type: z.literal(t), content: z.array(listItem).min(1).max(DESCRIPTION_LIMITS.nodes) }).strict();

const block = z.discriminatedUnion('type', [paragraph, list('bullet_list'), list('ordered_list')]);

const shape = z
  .object({
    type: z.literal('doc'),
    version: z.literal(DESCRIPTION_DOC_VERSION),
    content: z.array(block).max(DESCRIPTION_LIMITS.nodes),
  })
  .strict();

export type DescriptionText = z.infer<typeof textNode>;
export type DescriptionParagraph = z.infer<typeof paragraph>;
export type DescriptionListItem = z.infer<typeof listItem>;
export type DescriptionBlock = z.infer<typeof block>;
export type DescriptionDoc = z.infer<typeof shape>;

const inlineText = (c: DescriptionText[] | undefined) => (c ?? []).map((t) => t.text).join('');

/** Văn bản thuần tất định: mỗi đoạn / mục một dòng (mục số "1. ", chấm "- " KHÔNG thêm — chữ là chữ người dùng gõ). */
export function descriptionText(doc: DescriptionDoc): string {
  const lines: string[] = [];
  for (const b of doc.content) {
    if (b.type === 'paragraph') lines.push(inlineText(b.content));
    else for (const it of b.content) lines.push(inlineText(it.content));
  }
  return lines.join('\n').trim();
}

/** Số nút (gốc + khối + mục + chữ) và độ sâu lớn nhất (gốc = 0). */
function measure(doc: DescriptionDoc): { nodes: number; depth: number } {
  let nodes = 1;
  let depth = 0;
  for (const b of doc.content) {
    nodes++;
    depth = Math.max(depth, 1);
    if (b.type === 'paragraph') {
      nodes += b.content?.length ?? 0;
      if (b.content?.length) depth = Math.max(depth, 2);
    } else
      for (const it of b.content) {
        nodes += 1 + (it.content?.length ?? 0);
        depth = Math.max(depth, it.content?.length ? 3 : 2);
      }
  }
  return { nodes, depth };
}

/** Schema đầy đủ: cấu trúc đóng + giới hạn byte / nút / sâu / chữ. Dấu trùng trong một nút → không hợp lệ. */
export const descriptionDocSchema = shape.superRefine((doc, ctx) => {
  const bytes = new TextEncoder().encode(JSON.stringify(doc)).length;
  if (bytes > DESCRIPTION_LIMITS.bytes) ctx.addIssue({ code: 'custom', message: 'too_large' });
  const m = measure(doc);
  if (m.nodes > DESCRIPTION_LIMITS.nodes) ctx.addIssue({ code: 'custom', message: 'too_many_nodes' });
  if (m.depth > DESCRIPTION_LIMITS.depth) ctx.addIssue({ code: 'custom', message: 'too_deep' });
  if (descriptionText(doc).length > DESCRIPTION_LIMITS.text) ctx.addIssue({ code: 'custom', message: 'text_too_long' });
  const dupMarks = (c?: DescriptionText[]) => (c ?? []).some((t) => t.marks && new Set(t.marks).size !== t.marks.length);
  if (doc.content.some((b) => (b.type === 'paragraph' ? dupMarks(b.content) : b.content.some((it) => dupMarks(it.content))))) ctx.addIssue({ code: 'custom', message: 'duplicate_mark' });
});

/** Văn bản thuần cũ → tài liệu: mỗi dòng một đoạn (chữ giữ nguyên, kể cả `<` `>` `*` — không diễn giải HTML / Markdown). */
export function docFromPlain(text: string): DescriptionDoc {
  const t = text.trim();
  if (!t) return { type: 'doc', version: DESCRIPTION_DOC_VERSION, content: [] };
  return { type: 'doc', version: DESCRIPTION_DOC_VERSION, content: t.split(/\r?\n/).map((line) => (line ? { type: 'paragraph' as const, content: [{ type: 'text' as const, text: line }] } : { type: 'paragraph' as const })) };
}

/** Gộp chữ liền kề cùng dấu, bỏ nút chữ rỗng, sắp dấu theo thứ tự cố định — hai tài liệu tương đương lưu cùng một dạng. */
export function canonicalDoc(doc: DescriptionDoc): DescriptionDoc {
  const norm = (c?: DescriptionText[]) => {
    const out: DescriptionText[] = [];
    for (const t of c ?? []) {
      if (!t.text) continue;
      const marks = MARKS.filter((m) => t.marks?.includes(m));
      const prev = out[out.length - 1];
      const key = marks.join(',');
      if (prev && (prev.marks ?? []).join(',') === key) prev.text += t.text;
      else out.push({ type: 'text', text: t.text, ...(marks.length ? { marks } : {}) });
    }
    return out.length ? out : undefined;
  };
  return {
    type: 'doc',
    version: DESCRIPTION_DOC_VERSION,
    content: doc.content.map((b) => {
      if (b.type === 'paragraph') {
        const c = norm(b.content);
        return c ? { type: 'paragraph', content: c } : { type: 'paragraph' };
      }
      return { type: b.type, content: b.content.map((it) => {
        const c = norm(it.content);
        return c ? { type: 'list_item' as const, content: c } : { type: 'list_item' as const };
      }) };
    }),
  };
}
