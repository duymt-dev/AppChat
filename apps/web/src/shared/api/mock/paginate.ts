// Phân trang bảng có số trang (D42): `?page=&limit=` → `{ data, next_cursor, meta: { total, page, limit } }`.
// Backend: offset + deferred join (standards/api/response-envelope §2 — ngoại lệ "bảng có số trang"). Không truyền page → trả hết (ô chọn, modal).
const MAX = 100;

export const paginate = <T>(rows: T[], p: Record<string, unknown>) => {
  if (p.page === undefined) return { data: rows, next_cursor: null, meta: { total: rows.length, page: 1, limit: rows.length } };
  const limit = Math.min(MAX, Math.max(1, Number(p.limit) || 20));
  const pages = Math.max(1, Math.ceil(rows.length / limit));
  const page = Math.min(pages, Math.max(1, Number(p.page) || 1));
  const data = rows.slice((page - 1) * limit, page * limit);
  return { data, next_cursor: page < pages ? String(page + 1) : null, meta: { total: rows.length, page, limit } };
};
