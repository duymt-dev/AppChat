// Định dạng tiền / ngày / số theo locale + timezone workspace (standards/i18n §4). Tiền luôn là string VND.
import { localeDef } from '../i18n/locales';

export interface FmtOptions {
  locale: string;
  timeZone?: string;
}

const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

const toNumber = (v: string | number): number => (typeof v === 'number' ? v : Number(v));

export const createFmt = ({ locale, timeZone = DEFAULT_TZ }: FmtOptions) => {
  const intl = localeDef(locale).intl;
  const num = new Intl.NumberFormat(intl, { maximumFractionDigits: 2 });
  return {
    /** 1250000 → "1.250.000₫" — ký hiệu ₫ đặt sau, như prototype. */
    money: (v: string | number): string => `${new Intl.NumberFormat('vi-VN').format(toNumber(v))}₫`,
    /** 2450000 → "2.45M₫", 120000 → "120k₫" — dạng gọn của prototype (ví, chi phí agent). */
    moneyCompact: (v: string | number): string => {
      const n = toNumber(v);
      const trim = (x: number) => String(Number(x.toFixed(2)));
      if (Math.abs(n) >= 1e9) return `${trim(n / 1e9)}B₫`;
      if (Math.abs(n) >= 1e6) return `${trim(n / 1e6)}M₫`;
      if (Math.abs(n) >= 1e3) return `${trim(n / 1e3)}k₫`;
      return `${n}₫`;
    },
    number: (v: string | number): string => num.format(toNumber(v)),
    compact: (v: number): string =>
      new Intl.NumberFormat(intl, { notation: 'compact', maximumFractionDigits: 1 }).format(v),
    date: (d: Date | string | number): string =>
      new Intl.DateTimeFormat(intl, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone }).format(
        new Date(d),
      ),
    time: (d: Date | string | number): string =>
      new Intl.DateTimeFormat(intl, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone }).format(
        new Date(d),
      ),
    relative: (d: Date | string | number, now: number): string => {
      const diff = Math.round((new Date(d).getTime() - now) / 1000);
      const rtf = new Intl.RelativeTimeFormat(intl, { numeric: 'auto' });
      const abs = Math.abs(diff);
      if (abs < 60) return rtf.format(diff, 'second');
      if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
      if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
      return rtf.format(Math.round(diff / 86400), 'day');
    },
  };
};

export type Fmt = ReturnType<typeof createFmt>;
