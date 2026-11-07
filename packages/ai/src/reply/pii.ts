// Che PII trước khi gửi model (agent-gateway §9, Blueprint §5.3 bước 6): CCCD / CMND (9 hoặc 12 số), số thẻ (13–19 số, cho phép
// dấu cách / gạch), số tài khoản ngân hàng (6–20 số đứng sau "STK", "số tài khoản", "TK"). Thay bằng `[PII_n]`; bảng ánh xạ
// giữ ở DB tenant (ai_run.input) để khôi phục trong câu trả lời / input tool. Không che số điện thoại (10 số bắt đầu 0) và tiền.
export type PiiMap = Record<string, string>;

const CARD = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;
const ACCOUNT = /\b(?:stk|số\s*tài\s*khoản|so\s*tai\s*khoan|tài\s*khoản|tk)\s*[:.]?\s*(\d[\d ]{4,24}\d)/giu;
const ID = /(?<!\d|\d[.,])(\d{12}|\d{9})(?!\d|[.,]\d)/g;
const PHONE = /^0\d{9}$/;
const MONEY_AFTER = /^\s*(?:đ|₫|vnđ|vnd|k|nghìn|ngàn|triệu|tr)\b/iu;

const digits = (s: string) => s.replace(/\D/g, '');

/** Luhn — dãy 13–19 số qua được mới coi là số thẻ (tránh che mã đơn dài). */
function luhn(n: string): boolean {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export class PiiMasker {
  readonly map: PiiMap;
  private n: number;

  constructor(map: PiiMap = {}) {
    this.map = { ...map };
    this.n = Object.keys(this.map).length;
  }

  private token(value: string): string {
    const hit = Object.entries(this.map).find(([, v]) => v === value);
    if (hit) return hit[0];
    const t = `[PII_${++this.n}]`;
    this.map[t] = value;
    return t;
  }

  mask(text: string): string {
    let out = text.replace(ACCOUNT, (m, num: string) => m.replace(num, this.token(num)));
    out = out.replace(CARD, (m) => {
      const d = digits(m);
      return d.length >= 13 && d.length <= 19 && luhn(d) ? this.token(m) : m;
    });
    out = out.replace(ID, (m, _g, off: number, all: string) => {
      if (PHONE.test(m) || MONEY_AFTER.test(all.slice(off + m.length))) return m;
      return this.token(m);
    });
    return out;
  }
}

/** Khôi phục mọi `[PII_n]` trong chuỗi / object (input tool) — mã lạ giữ nguyên. */
export function unmaskPii<T>(v: T, map: PiiMap): T {
  if (!Object.keys(map).length) return v;
  if (typeof v === 'string') return v.replace(/\[PII_\d+\]/g, (t) => map[t] ?? t) as T;
  if (Array.isArray(v)) return v.map((x) => unmaskPii(x, map)) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unmaskPii(x, map)])) as T;
  return v;
}
