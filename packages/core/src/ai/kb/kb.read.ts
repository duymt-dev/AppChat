// Đọc kho tri thức cho trang Dữ liệu RAG (prototype L6906–6948; FE `features/settings/types.ts` KbData, schema `kbDataSchema`):
// thư mục, đếm theo nav (tất cả / AI đã học / từ hội thoại / do bạn upload / đánh dấu sao / thùng rác), tổng dung lượng, danh sách lọc
// theo nav / thư mục / tên hoặc thẻ không dấu. "Đã học" = nguồn `ready` có ≥ 1 đoạn. Danh sách ≤ 500 dòng (kho một DN nhỏ).
import { TenantSql as Prisma, type TenantDb } from '@appchat/db';
import type { z } from 'zod';
import type { kbDataSchema } from '@appchat/shared';
import type { Embedder } from '@appchat/ai';
import { readIndexStatus } from './reindex/index-status';

export type KbDataDto = z.infer<typeof kbDataSchema>;
export const KB_NAV = ['all', 'learned', 'conv', 'upload', 'star', 'trash'] as const;
export type KbNav = (typeof KB_NAV)[number];

/** Badge loại tệp (nhãn, màu chữ, nền) — bảng màu của prototype (fixture settings.kb.types). */
const TYPES: KbDataDto['types'] = {
  pdf: ['PDF', '#E0566A', '#FCEBEE'],
  xls: ['XLS', '#1B9E5A', '#EAF7EF'],
  doc: ['DOC', '#2563EB', '#EAF1FC'],
  folder: ['', '#C9820B', '#FBF3E2'],
  mp4: ['MP4', '#FFFFFF', '#231F20'],
  md: ['MD', '#0E9B94', '#E6F6F4'],
  ppt: ['PPT', '#E8602C', '#FCEEE6'],
  url: ['URL', '#6D4AE0', '#F1ECFD'],
  txt: ['TXT', '#5B6170', '#F1F2F4'],
};
const TYPE_OF: Record<string, string> = { pdf: 'pdf', docx: 'doc', doc: 'doc', xlsx: 'xls', xls: 'xls', csv: 'xls', md: 'md', txt: 'txt', text: 'txt', url: 'url', html: 'url', pptx: 'ppt', ppt: 'ppt', mp4: 'mp4' };
const SRC_OF: Record<string, string> = { upload: 'upload', drive: 'drive', conversation: 'conv', url: 'upload', text: 'upload', catalog: 'internal' };

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes ? `${bytes} B` : '—';
  const u = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? Math.round(v) : Number(v.toFixed(1))} ${u[i]}`;
}

type Db = Pick<TenantDb, 'kbFolder' | 'kbSource' | '$queryRaw'>;

interface CountRow {
  all: bigint;
  learned: bigint;
  conv: bigint;
  upload: bigint;
  star: bigint;
  trash: bigint;
  size: bigint | null;
}

const navWhere: Record<KbNav, Prisma.Sql> = {
  all: Prisma.sql`s.deleted_at IS NULL`,
  learned: Prisma.sql`s.deleted_at IS NULL AND s.status = 'ready' AND s.chunk_count > 0`,
  conv: Prisma.sql`s.deleted_at IS NULL AND s.origin = 'conversation'`,
  upload: Prisma.sql`s.deleted_at IS NULL AND s.origin IN ('upload','url','text')`,
  star: Prisma.sql`s.deleted_at IS NULL AND s.starred`,
  trash: Prisma.sql`s.deleted_at IS NOT NULL`,
};

/** TIP-020e §4.1: `GET /v1/settings/kb` kèm trạng thái chỉ mục embedding (đọc cấu hình router + sổ generation — không gọi provider). */
export async function readKbWithIndex(db: TenantDb, ws: string, f: { nav: string; folder: string | null; q: string }, names: (ids: string[]) => Promise<Map<string, string>>, embedder: Embedder | null, now: Date): Promise<KbDataDto> {
  const [data, index] = await Promise.all([readKb(db, f, names), readIndexStatus(db, ws, embedder, now)]);
  return { ...data, index };
}

export async function readKb(db: Db, f: { nav: string; folder: string | null; q: string }, names: (ids: string[]) => Promise<Map<string, string>>): Promise<KbDataDto> {
  const nav = (KB_NAV as readonly string[]).includes(f.nav) ? (f.nav as KbNav) : 'all';
  const [folders, [c]] = await Promise.all([
    db.kbFolder.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }], select: { id: true, name: true, visibility: true, parentId: true, version: true } }),
    db.$queryRaw<CountRow[]>`
      SELECT count(*) FILTER (WHERE deleted_at IS NULL) AS all,
             count(*) FILTER (WHERE deleted_at IS NULL AND status = 'ready' AND chunk_count > 0) AS learned,
             count(*) FILTER (WHERE deleted_at IS NULL AND origin = 'conversation') AS conv,
             count(*) FILTER (WHERE deleted_at IS NULL AND origin IN ('upload','url','text')) AS upload,
             count(*) FILTER (WHERE deleted_at IS NULL AND starred) AS star,
             count(*) FILTER (WHERE deleted_at IS NOT NULL) AS trash,
             sum(size_bytes) FILTER (WHERE deleted_at IS NULL) AS size
      FROM kb_source`,
  ]);
  const parts = [navWhere[nav]];
  if (f.folder) parts.push(Prisma.sql`s.folder_id::text = ${f.folder}`);
  const q = f.q.trim();
  if (q) parts.push(Prisma.sql`(f_unaccent(lower(s.name)) LIKE '%' || f_unaccent(lower(${q})) || '%' OR EXISTS (SELECT 1 FROM unnest(s.tags) t WHERE f_unaccent(lower(t)) LIKE '%' || f_unaccent(lower(${q})) || '%'))`);
  const rows = await db.$queryRaw<
    { id: string; name: string; kind: string; origin: string; tags: string[]; status: string; chunk_count: number; size_bytes: bigint; created_by: string | null; created_at: Date; folder_id: string | null; starred: boolean; visibility: 'public' | 'internal'; error: string | null }[]
  >`SELECT s.id, s.name, s.kind, s.origin::text AS origin, s.tags, s.status::text AS status, s.chunk_count, s.size_bytes, s.created_by, s.created_at, s.folder_id, s.starred, s.visibility, s.error
    FROM kb_source s WHERE ${Prisma.join(parts, ' AND ')} ORDER BY s.created_at DESC, s.id DESC LIMIT 500`;
  const who = await names([...new Set(rows.map((r) => r.created_by).filter((x): x is string => !!x))]);
  return {
    types: TYPES,
    folders: folders.map((f) => ({ id: f.id, name: f.name, visibility: f.visibility, parent_id: f.parentId, version: f.version })),
    nav: { all: Number(c!.all), learned: Number(c!.learned), conv: Number(c!.conv), upload: Number(c!.upload), star: Number(c!.star), trash: Number(c!.trash) },
    learned_total: Number(c!.learned),
    size: fmtSize(Number(c!.size ?? 0)),
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: TYPE_OF[r.kind] ?? 'txt',
      tags: r.tags,
      learned: r.status === 'ready' && r.chunk_count > 0,
      size: fmtSize(Number(r.size_bytes)),
      source: SRC_OF[r.origin] ?? 'upload',
      by: (r.created_by && who.get(r.created_by)) || '—',
      date: r.created_at.toISOString().slice(0, 10),
      folder_id: r.folder_id,
      starred: r.starred,
      visibility: r.visibility,
      status: r.status as 'pending' | 'processing' | 'ready' | 'failed',
      origin: r.origin as KbDataDto['data'][number]['origin'],
      ...(r.error ? { error: r.error } : {}),
    })),
  };
}
