// Sổ bí danh tài liệu của run (TIP-020d §1.1): mỗi lần truy hồi đã nhận phạm vi (ngữ cảnh đầu lượt + mọi lời gọi `kb.search` trong run)
// → mỗi đoạn được cấp bí danh ổn định `S1…S40` gắn (nguồn, đoạn, thế hệ nạp, băm đoạn đã nhận). Model chỉ thấy bí danh + nội dung đã
// được phép — không tên / đường dẫn / URL nguồn trong ngữ cảnh khách. Đoạn trùng giữ bí danh cũ; đầy 40 → không cấp thêm, lần truy hồi
// sau báo rõ "đã đủ nguồn" (không âm thầm gắn nhầm, không đẩy nguồn đã được trích ra). Trích dẫn của run cha qua run con: chỉ qua bí danh
// nhập lại vào sổ của cha (`importChild`), không lấy nhầm bí danh trùng tên của con.
import { createHash } from 'node:crypto';
import type { TenantDb } from '@appchat/db';

export const MAX_CITATION_CANDIDATES = 40;

export interface RegistryEntry {
  /** Bí danh model thấy (`S1`…). */
  a: string;
  /** source_id · chunk_id · ingest_seq (thế hệ nạp) · băm nội dung đoạn đã nhận. */
  s: string;
  c: string;
  g: number;
  d: string;
  /** Run giữ binding tri thức đã cho phép đoạn (kiểm nguồn hiện hành theo đúng phạm vi đó — TIP-020c). */
  b: string;
}

export interface RetrievedPassage {
  source_id: string;
  chunk_id: string;
  generation: number;
  content: string;
}

export const passageDigest = (content: string) => createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 32);

export function registryOf(v: unknown): RegistryEntry[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is RegistryEntry => !!x && typeof x.a === 'string' && typeof x.s === 'string' && typeof x.c === 'string' && Number.isInteger(x.g) && typeof x.d === 'string' && typeof x.b === 'string');
}

type Db = Pick<TenantDb, 'aiRun'>;

/**
 * Cấp bí danh cho các đoạn vừa truy hồi (cùng đoạn + cùng thế hệ → bí danh cũ). Trả bí danh theo thứ tự đoạn vào; `null` = sổ đầy (đoạn đó
 * không được trích dẫn trong câu trả lời này). Ghi một lần, không xoá bí danh đã cấp.
 */
export async function registerPassages(db: Db, runId: string, bindingRunId: string, passages: readonly RetrievedPassage[]): Promise<(string | null)[]> {
  if (!passages.length) return [];
  const run = await db.aiRun.findUnique({ where: { id: runId }, select: { citationRegistry: true } });
  if (!run) return passages.map(() => null);
  const reg = registryOf(run.citationRegistry);
  const key = (s: string, c: string, g: number) => `${s}:${c}:${g}`;
  const have = new Map(reg.map((e) => [key(e.s, e.c, e.g), e.a]));
  const out: (string | null)[] = [];
  let changed = false;
  for (const p of passages) {
    const k = key(p.source_id, p.chunk_id, p.generation);
    const hit = have.get(k);
    if (hit) {
      out.push(hit);
      continue;
    }
    if (reg.length >= MAX_CITATION_CANDIDATES) {
      out.push(null);
      continue;
    }
    const a = `S${reg.length + 1}`;
    reg.push({ a, s: p.source_id, c: p.chunk_id, g: p.generation, d: passageDigest(p.content), b: bindingRunId });
    have.set(k, a);
    out.push(a);
    changed = true;
  }
  if (changed) await db.aiRun.update({ where: { id: runId }, data: { citationRegistry: reg as object[] } });
  return out;
}

/** Sổ của run (đọc lại từ DB — client / model không gửi được sổ). */
export async function registryFor(db: Db, runId: string): Promise<RegistryEntry[]> {
  return registryOf((await db.aiRun.findUnique({ where: { id: runId }, select: { citationRegistry: true } }))?.citationRegistry);
}
