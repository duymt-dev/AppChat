// Danh mục metric đọc sẵn (Blueprint §3.4 insights, §5.2 query_data, TIP-038 mục 1): allowlist cố định — không nhận SQL, tên bảng / cột /
// biểu thức từ người gọi hay model. Cửa sổ [from, to) theo ngày giờ workspace (`to` loại trừ), mặc định 30 ngày, tối đa 366 ngày; bucket
// day / week (Thứ Hai) / month; mỗi kết quả ≤ 100 dòng.
import { z } from 'zod';

export const METRIC_KEYS = ['sales.booked', 'sales.collected', 'customers.at_risk', 'agents.performance', 'support.performance'] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
export const isMetricKey = (v: string): v is MetricKey => (METRIC_KEYS as readonly string[]).includes(v);

export const METRIC_BUCKETS = ['day', 'week', 'month'] as const;
export type MetricBucket = (typeof METRIC_BUCKETS)[number];

export const INSIGHT_LIMITS = { defaultDays: 30, maxDays: 366, maxRows: 100, atRiskDefault: 20 } as const;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const windowParams = { from: day.optional(), to: day.optional() };
const bucketed = { ...windowParams, bucket: z.enum(METRIC_BUCKETS).optional() };

/** Tham số riêng từng metric (strict — khoá lạ bị từ chối). */
export const METRIC_PARAMS = {
  'sales.booked': z.object(bucketed).strict(),
  'sales.collected': z.object(bucketed).strict(),
  // Khách sắp rời tính tại hiện tại: không đơn hoàn tất nào trong `days` ngày gần nhất (mặc định 30) — cửa sổ = [hôm nay − days, ngày mai).
  'customers.at_risk': z.object({ days: z.coerce.number().int().min(7).max(INSIGHT_LIMITS.maxDays).optional(), limit: z.coerce.number().int().min(1).max(INSIGHT_LIMITS.maxRows).optional() }).strict(),
  'agents.performance': z.object({ ...windowParams, agent_id: z.string().uuid().optional() }).strict(),
  'support.performance': z.object(bucketed).strict(),
} as const satisfies Record<MetricKey, z.ZodTypeAny>;
export type MetricParams<K extends MetricKey> = z.infer<(typeof METRIC_PARAMS)[K]>;

/** Ngày lịch "YYYY-MM-DD" ± n ngày (lịch thuần — không phụ thuộc múi / giờ mùa hè). */
export function addDays(date: string, n: number): string {
  const d = new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** Khoá bucket của một ngày lịch: ngày · Thứ Hai đầu tuần · ngày 1 của tháng. */
export function bucketKey(date: string, bucket: MetricBucket): string {
  if (bucket === 'day') return date;
  if (bucket === 'month') return `${date.slice(0, 8)}01`;
  const wd = (new Date(Date.parse(`${date}T00:00:00Z`)).getUTCDay() + 6) % 7;
  return addDays(date, -wd);
}

/** Các bucket phủ [from, to) theo thứ tự (dùng điền 0 cho kỳ không có dữ liệu). */
export function bucketKeys(from: string, to: string, bucket: MetricBucket): string[] {
  const out: string[] = [];
  for (let d = from; d < to; d = addDays(d, 1)) {
    const k = bucketKey(d, bucket);
    if (out[out.length - 1] !== k) out.push(k);
  }
  return out;
}

/** Bucket mặc định theo độ dài cửa sổ — luôn ≤ 100 kỳ. */
export const defaultBucket = (days: number): MetricBucket => (days <= 62 ? 'day' : days <= 182 ? 'week' : 'month');
