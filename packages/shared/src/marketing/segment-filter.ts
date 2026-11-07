// Điều kiện phân khúc khách (REQ-I01, Blueprint §2.2 segment.filter): AST ĐÓNG — and / or lồng tối đa MAX_DEPTH, tối đa MAX_NODES
// nút; trường thuộc allowlist, toán tử có kiểu; ngày dạng số ngày tương đối hoặc `YYYY-MM-DD`; tiền là chuỗi số VND. Không nhận SQL /
// biểu thức tự do. Server biên dịch sang SQL tham số hoá (core `marketing/services/segments.service.ts`); `evaluateSegment` thuần dùng
// cho mock FE + test (cùng ngữ nghĩa).
import { z } from 'zod';

export const SEGMENT_MAX_DEPTH = 3;
export const SEGMENT_MAX_NODES = 30;
export const SEGMENT_MAX_VALUES = 50;

const vnd = z.string().regex(/^\d{1,15}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const days = z.number().int().min(0).max(3650);
const text = z.string().trim().min(1).max(80);
const many = z.array(text).min(1).max(SEGMENT_MAX_VALUES);

/** Điều kiện lá — mỗi trường có tập toán tử riêng (union thường: trường ngày có nhiều dạng toán tử). */
export const segmentLeafSchema = z.union([
  z.object({ field: z.literal('tag'), op: z.enum(['has_any', 'has_all', 'has_none']), value: many }).strict(),
  z.object({ field: z.literal('stage'), op: z.enum(['in', 'not_in']), value: z.array(z.enum(['lead', 'potential', 'consulting', 'quote', 'contract', 'won', 'lost'])).min(1).max(7) }).strict(),
  z.object({ field: z.literal('source'), op: z.enum(['in', 'not_in']), value: many }).strict(),
  z.object({ field: z.literal('group'), op: z.enum(['in', 'not_in']), value: z.array(z.enum(['vip', 'loyal', 'new', 'potential'])).min(1).max(4) }).strict(),
  z.object({ field: z.literal('tier'), op: z.enum(['in', 'not_in']), value: many }).strict(),
  z.object({ field: z.literal('total_spent'), op: z.enum(['gte', 'lte', 'between']), value: vnd, value2: vnd.optional() }).strict(),
  z.object({ field: z.enum(['last_order_at', 'last_interaction_at']), op: z.enum(['older_than_days', 'within_days']), value: days }).strict(),
  z.object({ field: z.enum(['last_order_at', 'last_interaction_at']), op: z.enum(['before', 'after']), value: date }).strict(),
  z.object({ field: z.literal('last_order_at'), op: z.literal('never') }).strict(),
  z.object({ field: z.literal('order_count'), op: z.enum(['gte', 'lte']), value: z.number().int().min(0).max(100_000) }).strict(),
  z.object({ field: z.literal('purchased_product'), op: z.enum(['any_of', 'none_of']), value: z.array(z.string().min(1).max(64)).min(1).max(SEGMENT_MAX_VALUES) }).strict(),
]);
export type SegmentLeaf = z.infer<typeof segmentLeafSchema>;
export type SegmentNode = SegmentLeaf | { op: 'and' | 'or'; children: SegmentNode[] };

export const segmentNodeSchema: z.ZodType<SegmentNode> = z.lazy(() =>
  z.union([z.object({ op: z.enum(['and', 'or']), children: z.array(segmentNodeSchema).min(1).max(SEGMENT_MAX_NODES) }).strict(), segmentLeafSchema]),
);

/** Lỗi cấu trúc ngoài kiểu (độ sâu / số nút / khoảng tiền). Trả mã lỗi đầu tiên hoặc null. */
export function segmentShapeError(n: SegmentNode): 'depth' | 'nodes' | 'range' | null {
  let nodes = 0;
  const walk = (x: SegmentNode, d: number): 'depth' | 'nodes' | 'range' | null => {
    nodes++;
    if (nodes > SEGMENT_MAX_NODES) return 'nodes';
    if ('children' in x) {
      if (d >= SEGMENT_MAX_DEPTH) return 'depth';
      for (const c of x.children) {
        const e = walk(c, d + 1);
        if (e) return e;
      }
      return null;
    }
    if (x.field === 'total_spent' && x.op === 'between' && (!x.value2 || BigInt(x.value2) < BigInt(x.value))) return 'range';
    return null;
  };
  return walk(n, 0);
}

/** Schema đầy đủ (kiểu + cấu trúc) — dùng ở action segment.* / campaign.*. */
export const segmentFilterSchema = segmentNodeSchema.superRefine((n, ctx) => {
  const e = segmentShapeError(n);
  if (e) ctx.addIssue({ code: 'custom', message: e });
});

/** Dữ liệu khách tối thiểu để đánh giá (mock / test) — cùng ngữ nghĩa với SQL. */
export interface SegmentSubject {
  tags: string[];
  stage: string;
  source: string;
  group: string | null;
  tier: string | null;
  total_spent: string;
  last_order_at: string | null;
  last_interaction_at: string;
  order_count: number;
  products: string[];
}

const DAY = 86_400_000;

export function evaluateSegment(n: SegmentNode, s: SegmentSubject, now: Date): boolean {
  if ('children' in n) return n.op === 'and' ? n.children.every((c) => evaluateSegment(c, s, now)) : n.children.some((c) => evaluateSegment(c, s, now));
  switch (n.field) {
    case 'tag':
      return n.op === 'has_any' ? n.value.some((v) => s.tags.includes(v)) : n.op === 'has_all' ? n.value.every((v) => s.tags.includes(v)) : !n.value.some((v) => s.tags.includes(v));
    case 'stage':
    case 'source':
    case 'group':
    case 'tier': {
      const v = n.field === 'stage' ? s.stage : n.field === 'source' ? s.source : n.field === 'group' ? s.group : s.tier;
      const hit = v !== null && (n.value as string[]).includes(v);
      return n.op === 'in' ? hit : !hit;
    }
    case 'total_spent': {
      const t = BigInt(s.total_spent);
      if (n.op === 'gte') return t >= BigInt(n.value);
      if (n.op === 'lte') return t <= BigInt(n.value);
      return t >= BigInt(n.value) && t <= BigInt(n.value2 ?? n.value);
    }
    case 'order_count':
      return n.op === 'gte' ? s.order_count >= n.value : s.order_count <= n.value;
    case 'purchased_product': {
      const hit = n.value.some((v) => s.products.includes(v));
      return n.op === 'any_of' ? hit : !hit;
    }
    case 'last_order_at':
    case 'last_interaction_at': {
      const raw = n.field === 'last_order_at' ? s.last_order_at : s.last_interaction_at;
      if (n.op === 'never') return raw === null;
      if (raw === null) return false;
      const at = new Date(raw).getTime();
      if (n.op === 'older_than_days') return at < now.getTime() - n.value * DAY;
      if (n.op === 'within_days') return at >= now.getTime() - n.value * DAY;
      const ref = new Date(`${n.value}T00:00:00Z`).getTime();
      return n.op === 'before' ? at < ref : at >= ref;
    }
  }
}
