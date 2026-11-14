// Ứng viên công bố của một lần nạp (TIP-003c §4.6): parse + embed chạy NGOÀI transaction ở worker ROLE=ai, kết quả giữ trong tiến trình
// theo (workspace, nguồn, lần nạp) đúng trong lúc gọi action riêng (cùng tiến trình với Executor) — đoạn / vector / lỗi không bao giờ đi
// qua input, action log hay Redis. Handler lấy một lần (take); thiếu ứng viên → no_effect, không công bố rỗng.
export type KbCandidate =
  | { kind: 'ready'; model: string; /** Space đã embed (TIP-020e) — publish chỉ ghi khe hoạt động khi khớp. */ space: string; chunks: { content: string; tokens: number; meta: unknown; vector: number[] }[] }
  | { kind: 'failed'; error: string }
  | { kind: 'unlearned' };

const held = new Map<string, KbCandidate>();
const key = (ws: string, sourceId: string, seq: string) => `${ws}:${sourceId}:${seq}`;

export async function withCandidate<T>(ws: string, sourceId: string, seq: number, c: KbCandidate, fn: () => Promise<T>): Promise<T> {
  const k = key(ws, sourceId, String(seq));
  held.set(k, c);
  try {
    return await fn();
  } finally {
    held.delete(k);
  }
}

export function takeCandidate(ws: string, sourceId: string, seq: string): KbCandidate | null {
  const k = key(ws, sourceId, seq);
  const c = held.get(k) ?? null;
  held.delete(k);
  return c;
}
