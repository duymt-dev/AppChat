// Kỳ + giờ gửi email tóm tắt (TIP-038 pha 4, DC-241 / DC-366) — thuần, tính ở JS theo giờ workspace (Q-053, không `AT TIME ZONE` trong SQL).
// Hằng ngày: kỳ = ngày hôm qua [00:00, 00:00 hôm nay), gửi lúc 08:00 hôm nay (nhãn UI "Hằng ngày · 08:00"). Hằng tuần: kỳ = tuần trước
// [Thứ Hai 00:00, Thứ Hai tuần này 00:00), gửi Thứ Hai 08:00. Ranh giới ngày theo LỊCH (cộng ngày trên chuỗi YYYY-MM-DD rồi quy UTC) — không
// cộng 86.400 giây (DST). DND: mốc gửi rơi vào giờ yên lặng → lùi tới giờ được phép kế tiếp (vẫn trong kỳ gửi); qua hết hạn gửi → bỏ kỳ đó
// (không dồn backlog nhiều email).
import { utcToWall, wallToUtc, weekdayOf, type NotifyPrefsData } from '@appchat/shared';

export const DIGEST_HOUR = '08:00';
/** Hạn gửi một kỳ tính từ mốc gửi — trễ hơn thì bỏ kỳ (không gửi bù email cũ). */
export const DIGEST_GRACE_MS = 20 * 60 * 60_000;

export type Cadence = 'daily' | 'weekly';
export interface Period {
  cadence: Cadence;
  /** Ngày đầu kỳ YYYY-MM-DD theo giờ workspace (nhãn email). */
  label: string;
  start: Date;
  end: Date;
  /** Mốc gửi (08:00 ngày đóng kỳ, chưa tính DND). */
  sendAt: Date;
}

const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Kỳ vừa đóng gần nhất có mốc gửi ≤ `now` (trước 08:00 ngày đóng kỳ → kỳ trước đó). */
export function lastClosedPeriod(cadence: Cadence, now: Date, timeZone: string): Period {
  const today = utcToWall(now, timeZone).date;
  // Ngày đóng kỳ: hằng ngày = hôm nay; hằng tuần = Thứ Hai gần nhất (kể cả hôm nay).
  let close = cadence === 'daily' ? today : addDays(today, -weekdayOf(today));
  if (wallToUtc(close, DIGEST_HOUR, timeZone) > now) close = addDays(close, cadence === 'daily' ? -1 : -7);
  const first = addDays(close, cadence === 'daily' ? -1 : -7);
  return {
    cadence,
    label: first,
    start: wallToUtc(first, '00:00', timeZone),
    end: wallToUtc(close, '00:00', timeZone),
    sendAt: wallToUtc(close, DIGEST_HOUR, timeZone),
  };
}

const minutes = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Mốc được phép gửi: `at` nếu ngoài giờ yên lặng, không thì giờ kết thúc DND kế tiếp (theo giờ workspace). */
export function afterQuietHours(at: Date, dnd: NotifyPrefsData['dnd'], timeZone: string): Date {
  if (!dnd.on || minutes(dnd.from) === minutes(dnd.to)) return at;
  const w = utcToWall(at, timeZone);
  const now = minutes(w.hm);
  const [from, to] = [minutes(dnd.from), minutes(dnd.to)];
  const quiet = from < to ? now >= from && now < to : now >= from || now < to;
  if (!quiet) return at;
  // Kết thúc DND rơi vào hôm nay nếu còn phía trước, không thì ngày mai.
  const day = now < to ? w.date : addDays(w.date, 1);
  return wallToUtc(day, dnd.to, timeZone);
}

/** Bỏ kỳ khi đã quá hạn gửi (worker chết lâu / DND kéo dài hết hạn) — không gửi bù. */
export const expired = (p: Pick<Period, 'sendAt'>, now: Date) =>
  now.getTime() - p.sendAt.getTime() > DIGEST_GRACE_MS;
