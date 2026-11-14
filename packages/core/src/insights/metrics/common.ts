// Phần chung của metric (TIP-038 mục 1): cửa sổ [from, to) theo ngày workspace → mốc UTC (đúng cả múi có giờ mùa hè — wallToUtc tại từng
// mốc, không cộng 86 400 giây), kiểm tham số theo metric, quyền nguồn (insights.view là cổng; mỗi nguồn cần thêm quyền module + scope đọc
// khác none), bigint → chuỗi VND. Lỗi tham số → 422 VALIDATION_FAILED (không 500, không im lặng đổi giá trị).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, INSIGHT_LIMITS, METRIC_PARAMS, addDays, bucketKeys, can, daysBetween, defaultBucket, utcToWall, wallToUtc, type AuthzContext, type InsightResultDto, type MetricBucket, type MetricKey, type PermissionKey, type ScopeModule } from '@appchat/shared';
import { levelOf } from '../../authz/data-access';
import type { TenantTx } from '../../kernel/actions/action-context';

export interface MetricWindow {
  from: string;
  to: string;
  timezone: string;
  fromUtc: Date;
  toUtc: Date;
  bucket?: MetricBucket;
}

export interface MetricCtx {
  tx: TenantTx;
  authz: AuthzContext;
  window: MetricWindow;
  now: Date;
}

export type MetricBody = Pick<InsightResultDto, 'columns' | 'rows' | 'sources' | 'sample_count' | 'availability'> & Partial<Pick<InsightResultDto, 'chart'>>;

const bad = (field: string, code: string) => new AppError('VALIDATION_FAILED', 422, { [field]: code });

/** Tham số metric (zod strict theo metric) — khoá lạ / sai kiểu → 422 kèm đường dẫn. */
export function parseParams<K extends MetricKey>(metric: K, raw: unknown): Record<string, unknown> {
  const p = METRIC_PARAMS[metric].safeParse(raw ?? {});
  if (!p.success) throw new AppError('VALIDATION_FAILED', 422, Object.fromEntries(p.error.issues.map((i) => [`params.${i.path.join('.') || '_'}`, i.code])));
  return p.data as Record<string, unknown>;
}

/** Ngày lịch có thật ("2026-02-30" → false — không để Date tự chuẩn hoá sang tháng sau). */
const realDay = (d: string) => {
  const t = Date.parse(`${d}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === d;
};

/** Cửa sổ ngày: thiếu `to` → hết hôm nay (ngày mai 00:00 workspace); thiếu `from` → `to` − 30 ngày. Tối đa 366 ngày, from < to. */
export function resolveWindow(p: { from?: string; to?: string; bucket?: MetricBucket }, timezone: string, now: Date, bucketed: boolean): MetricWindow {
  const today = utcToWall(now, timezone).date;
  const to = p.to ?? addDays(today, 1);
  const from = p.from ?? addDays(to, -INSIGHT_LIMITS.defaultDays);
  if (!realDay(from)) throw bad('params.from', 'invalid_date');
  if (!realDay(to)) throw bad('params.to', 'invalid_date');
  const days = daysBetween(from, to);
  if (days <= 0) throw bad('params.to', 'must_be_after_from');
  if (days > INSIGHT_LIMITS.maxDays) throw bad('params.from', 'window_too_long');
  return { from, to, timezone, fromUtc: wallToUtc(from, '00:00', timezone), toUtc: wallToUtc(to, '00:00', timezone), ...(bucketed ? { bucket: p.bucket ?? defaultBucket(days) } : {}) };
}

/** Nguồn đọc được khi có quyền module + scope đọc khác none (Owner luôn được — resolver, không theo tên vai trò). */
export function sourceDenial(a: AuthzContext, perms: readonly PermissionKey[], scope: ScopeModule | null): string | null {
  if (!perms.some((p) => can(a, p))) return `permission:${perms[0]}`;
  if (scope && levelOf(a, scope, 'read') === 'none') return `scope:${scope}`;
  return null;
}

const RANK = { none: 0, own: 1, team: 2, all: 3 } as const;
const DOMAIN_SCOPES = ['inbox', 'crm', 'sales', 'booking', 'support'] as const;

/**
 * Quyền đọc số liệu = scope `insights` ∩ scope domain (TIP-038: "scope insights và scope domain phải cùng cho phép; none ở một bên không đọc
 * dữ liệu"). Owner (resolver) giữ nguyên. Chỉ thu hẹp đọc — không bao giờ mở rộng.
 */
export function insightAuthz(a: AuthzContext): AuthzContext {
  if (a.isOwner) return a;
  const cap = a.scope.insights ?? 'none';
  const scope = { ...a.scope };
  for (const m of DOMAIN_SCOPES) if (RANK[scope[m] ?? 'none'] > RANK[cap]) scope[m] = cap;
  return { ...a, scope, writeScope: scope };
}

/**
 * Kỳ của cửa sổ dưới dạng bảng tham số `b(k, s, e)` — mốc UTC tính ở JS (`wallToUtc` từng mốc), KHÔNG quy đổi múi giờ trong SQL: tham số
 * và cột đi cùng một đường mã hoá của adapter nên so sánh luôn đúng, kể cả khi TimeZone phiên Postgres khác UTC (Q-053). Join cột thời gian
 * `col >= b.s AND col < b.e` (nửa mở) — mỗi dòng rơi vào đúng một kỳ.
 */
export function bucketsSql(w: MetricWindow): { keys: string[]; sql: Prisma.Sql } {
  const keys = bucketKeys(w.from, w.to, w.bucket!);
  const edge = (d: string) => wallToUtc(d, '00:00', w.timezone);
  const starts = keys.map((k) => edge(k < w.from ? w.from : k));
  const ends = keys.map((k, i) => (i + 1 < keys.length ? edge(keys[i + 1]!) : w.toUtc));
  return { keys, sql: Prisma.sql`unnest(${keys}::text[], ${starts}::timestamptz[], ${ends}::timestamptz[]) AS b(k, s, e)` };
}

export const money = (v: bigint | null | undefined) => String(v ?? 0n);
export const num = (v: bigint | number | null | undefined) => Number(v ?? 0);

/** Kết quả rỗng khi nguồn duy nhất bị chặn — không truy vấn, không trả tổng. */
export function unavailable(columns: MetricBody['columns'], source: string, reason: string): MetricBody {
  return { columns, rows: [], sources: [], sample_count: 0, availability: { status: 'unavailable', excluded: [{ source, reason }] } };
}

