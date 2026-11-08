// Hợp đồng payload đơn sàn chạy lúc runtime (TIP-015f §3.7): kiểm TRƯỚC mọi ghi danh tính / đơn cho cả đường nhập lẫn đường chặn. `ExternalOrder`
// của port chỉ là interface TypeScript — ở đây mới là kiểm thật: ≤ 256 KiB UTF-8, 1–500 dòng, trường định danh 1–256 ký tự, tên ≤ 500, SĐT ≤ 64,
// qty hữu hạn > 0, tiền là chuỗi số nguyên VND 0..int64 (không đổi sang số thực), thời điểm ISO có múi giờ, updated_at ≥ created_at, không
// tương lai quá 5 phút so với đồng hồ nhận. Trường lạ → từ chối (không lưu object tuỳ ý của sàn). Hash chuẩn tắc theo trường có thứ tự +
// UTC + thập phân chuẩn hoá (không phụ thuộc thứ tự key JSON); giữ nguyên tổng của sàn, không tính lại từ dòng.
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ExternalOrder } from '@appchat/integrations';

const MAX_BYTES = 256 * 1024;
const SKEW_MS = 5 * 60_000;
const INT64_MAX = 9223372036854775807n;

const id = z.string().trim().min(1).max(256);
const money = z.string().regex(/^\d{1,19}$/).refine((s) => /^\d{1,19}$/.test(s) &&BigInt(s) <= INT64_MAX, 'money_range');
const iso = z.string().max(64).regex(/(Z|[+-]\d{2}:?\d{2})$/, 'timezone').refine((s) => !Number.isNaN(Date.parse(s)), 'iso');

const line = z.strictObject({ sku: z.string().max(256), name: z.string().trim().min(1).max(500), qty: z.number().finite().positive().max(1_000_000), unit_price: money });
const schema = z.strictObject({
  external_id: id,
  platform: id,
  platform_status: id,
  buyer: z.strictObject({ id, name: z.string().max(500), phone: z.string().max(64).nullable().optional() }),
  lines: z.array(line).min(1).max(500),
  total: money,
  paid: z.boolean(),
  shipping: z.strictObject({ carrier: z.string().max(256).optional(), tracking: z.string().max(256).optional(), eta: iso.optional() }).optional(),
  created_at: iso,
  updated_at: iso,
});

export type PayloadCheck = { ok: true; order: ExternalOrder; hash: string; updatedAt: Date } | { ok: false; reason: string };

/** Kiểm + chuẩn hoá một đơn sàn; lý do lỗi đã che (chỉ đường dẫn + mã, không giá trị). */
export function checkExternalOrder(raw: unknown, now: Date): PayloadCheck {
  let bytes: number;
  try {
    bytes = Buffer.byteLength(JSON.stringify(raw) ?? '', 'utf8');
  } catch {
    return { ok: false, reason: 'unserializable' };
  }
  if (bytes > MAX_BYTES) return { ok: false, reason: 'too_large' };
  const p = schema.safeParse(raw);
  if (!p.success) {
    const i = p.error.issues[0]!;
    return { ok: false, reason: `${i.path.join('.') || 'root'}:${i.code}`.slice(0, 120) };
  }
  const o = p.data;
  const created = new Date(o.created_at);
  const updated = new Date(o.updated_at);
  if (updated < created) return { ok: false, reason: 'updated_at:before_created' };
  if (updated.getTime() > now.getTime() + SKEW_MS || created.getTime() > now.getTime() + SKEW_MS) return { ok: false, reason: 'timestamp:future' };
  return { ok: true, order: o as ExternalOrder, hash: canonicalHash(o as ExternalOrder), updatedAt: updated };
}

/** Hash theo trường có thứ tự cố định (không theo thứ tự key JSON); thời điểm UTC, tiền giữ chuỗi số nguyên đã bỏ 0 đầu. */
export function canonicalHash(o: ExternalOrder): string {
  const n = (s: string) => BigInt(s).toString();
  const t = (s: string | undefined) => (s ? new Date(s).toISOString() : '');
  const parts = [
    o.external_id, o.platform, o.platform_status, o.buyer.id, o.buyer.name, o.buyer.phone ?? '',
    String(o.lines.length), ...o.lines.flatMap((l) => [l.sku, l.name, String(l.qty), n(l.unit_price)]),
    n(o.total), o.paid ? '1' : '0', o.shipping?.carrier ?? '', o.shipping?.tracking ?? '', t(o.shipping?.eta), t(o.created_at), t(o.updated_at),
  ];
  return createHash('sha256').update(parts.map((x) => `${x.length}:${x}`).join('|')).digest('hex');
}
