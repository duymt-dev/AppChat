// Kiểu list có số trang (D42) — envelope `{ data, next_cursor, meta }` (response-envelope §1–2).
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
}

export interface Paged<T> {
  data: T[];
  next_cursor: string | null;
  meta: PageMeta;
}

export interface PageState {
  page: number;
  limit: number;
}

export const FIRST_PAGE: PageState = { page: 1, limit: 20 };
