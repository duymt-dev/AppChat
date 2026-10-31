// Gộp nhiều danh sách xếp hạng bằng Reciprocal Rank Fusion (rag §6, k = 60): điểm = Σ 1 / (k + hạng), hạng tính từ 1.
export const RRF_K = 60;

export function rrf(lists: readonly (readonly string[])[], k = RRF_K): { id: string; score: number }[] {
  const score = new Map<string, number>();
  for (const list of lists) list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (k + i + 1)));
  return [...score].map(([id, s]) => ({ id, score: s })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
