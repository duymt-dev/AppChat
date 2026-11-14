// Kho từ điển gợi ý danh mục ticket (TIP-034b §1.1): một dòng `ticket_category_config` (khoá cố định). Chưa có dòng = bản ảo version 0
// (8 nhãn prototype) — đọc KHÔNG ghi. Ghi = CAS: version 0 → INSERT … ON CONFLICT DO NOTHING (hai yêu cầu version 0 cùng lúc chỉ một
// thắng); version ≥ 1 → UPDATE … WHERE version = if_version. Lệch → 409 STALE_VERSION kèm version hiện tại (UI giữ bản nháp, tải lại).
import { AppError, CATEGORY_CONFIG_KEY, DEFAULT_CATEGORY_LABELS } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';

export interface CategoryConfig {
  version: number;
  labels: string[];
  updatedAt: Date | null;
  updatedBy: string | null;
}

type Row = { labels: unknown; version: number; updated_at: Date; updated_by: string | null };

const of = (r: Row | undefined): CategoryConfig =>
  r ? { version: r.version, labels: (r.labels as string[]).map(String), updatedAt: r.updated_at, updatedBy: r.updated_by } : { version: 0, labels: [...DEFAULT_CATEGORY_LABELS], updatedAt: null, updatedBy: null };

export const configDto = (c: CategoryConfig) => ({ version: c.version, labels: c.labels, default: c.labels[0] ?? '' });

export async function readCategoryConfig(tx: TenantTx, lock = false): Promise<CategoryConfig> {
  const rows = lock
    ? await tx.$queryRaw<Row[]>`SELECT labels, version, updated_at, updated_by FROM ticket_category_config WHERE key = ${CATEGORY_CONFIG_KEY} FOR UPDATE`
    : await tx.$queryRaw<Row[]>`SELECT labels, version, updated_at, updated_by FROM ticket_category_config WHERE key = ${CATEGORY_CONFIG_KEY}`;
  return of(rows[0]);
}

const stale = async (tx: TenantTx): Promise<never> => {
  const cur = await readCategoryConfig(tx);
  throw new AppError('STALE_VERSION', 409, { version: String(cur.version) });
};

/** Ghi cả bộ nhãn nếu version hiện tại = `ifVersion`; trả version mới (tăng đúng 1). */
export async function writeCategoryConfig(tx: TenantTx, ifVersion: number, labels: string[], by: string | null, now: Date): Promise<number> {
  const json = JSON.stringify(labels);
  const rows =
    ifVersion === 0
      ? await tx.$queryRaw<{ version: number }[]>`
          INSERT INTO ticket_category_config (key, labels, version, updated_at, updated_by) VALUES (${CATEGORY_CONFIG_KEY}, ${json}::jsonb, 1, ${now}, ${by})
          ON CONFLICT (key) DO NOTHING RETURNING version`
      : await tx.$queryRaw<{ version: number }[]>`
          UPDATE ticket_category_config SET labels = ${json}::jsonb, version = version + 1, updated_at = ${now}, updated_by = ${by}
          WHERE key = ${CATEGORY_CONFIG_KEY} AND version = ${ifVersion} RETURNING version`;
  return rows[0]?.version ?? stale(tx);
}
