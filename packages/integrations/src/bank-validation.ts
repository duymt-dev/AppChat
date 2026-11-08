// Chuẩn hoá chặt giao dịch ngân hàng (TIP-012b §2.2): dùng chung SePay / Casso. Không cắt / ép kiểu: tiền phải là số nguyên an toàn
// (number) hoặc chuỗi chữ số, trong giới hạn bigint của Postgres; chiều tiền chỉ `in` / `out` tường minh; số tài khoản bắt buộc, chỉ bỏ
// khoảng trắng / chấm / gạch (giữ số 0 đầu, chữ cái); giờ "YYYY-MM-DD HH:mm:ss" không múi giờ hiểu là giờ Việt Nam (+07:00), ngày phải
// có thật — không rơi về `new Date(chuỗi lạ)` theo giờ máy chủ. Sai bất kỳ trường nào → `ProviderError('invalid_payload', field)`.
import { ProviderError } from './provider-errors';

export const MAX_BATCH = 1000;
const PG_BIGINT_MAX = 9_223_372_036_854_775_807n;

/** Tiền VND không dấu → chuỗi số nguyên. `signed` cho phép số âm (Casso: âm = tiền ra) — trả kèm dấu. */
export function strictAmount(v: unknown, field: string, signed = false): { abs: string; negative: boolean } {
  let s: string;
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) throw new ProviderError('invalid_payload', field);
    s = String(v);
  } else if (typeof v === 'string' && /^-?\d{1,19}$/.test(v)) s = v;
  else throw new ProviderError('invalid_payload', field);
  const negative = s.startsWith('-');
  if (negative && !signed) throw new ProviderError('invalid_payload', field);
  const abs = BigInt(negative ? s.slice(1) : s);
  if (abs > PG_BIGINT_MAX) throw new ProviderError('invalid_payload', field);
  return { abs: abs.toString(), negative: negative && abs > 0n };
}

/** Số tài khoản: bắt buộc; bỏ khoảng trắng / `.` / `-`; còn lại chỉ chữ + số (1–40 ký tự), viết hoa. */
export function normalizeAccount(v: unknown, field = 'account_number'): string {
  const s = typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\s.-]/g, '').toUpperCase() : '';
  if (!/^[A-Z0-9]{1,40}$/.test(s)) throw new ProviderError('invalid_payload', field);
  return s;
}

/** Như `normalizeAccount` nhưng rỗng → '' (cấu hình feed cũ chưa có tài khoản). */
export const accountOrEmpty = (v: unknown): string => {
  try {
    return normalizeAccount(v);
  } catch {
    return '';
  }
};

/** "YYYY-MM-DD HH:mm:ss" giờ Việt Nam → ISO UTC; ngày / giờ không có thật → lỗi. */
export function vnLocalTime(v: unknown, field: string): string {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(v) : null;
  if (!m) throw new ProviderError('invalid_payload', field);
  const [y, mo, d, h, mi, se] = m.slice(1).map(Number) as [number, number, number, number, number, number];
  const utc = Date.UTC(y, mo - 1, d, h, mi, se);
  const back = new Date(utc);
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d || h > 23 || mi > 59 || se > 59) throw new ProviderError('invalid_payload', field);
  return new Date(utc - 7 * 3600_000).toISOString();
}

/** Mã giao dịch provider: chuỗi / số nguyên không âm, 1–200 ký tự. */
export function externalId(v: unknown, field = 'id'): string {
  const s = typeof v === 'number' ? (Number.isSafeInteger(v) && v >= 0 ? String(v) : '') : typeof v === 'string' ? v.trim() : '';
  if (!s || s.length > 200) throw new ProviderError('invalid_payload', field);
  return s;
}

/** Chuỗi văn bản tuỳ chọn (nội dung chuyển khoản / mã tham chiếu) — không phải chuỗi → ''; cắt 500 ký tự. */
export const text = (v: unknown, max = 500): string => (typeof v === 'string' ? v.slice(0, max) : '');

export function parseJsonObject(raw: string): Record<string, unknown> {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new ProviderError('invalid_payload', 'body');
  }
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new ProviderError('invalid_payload', 'body');
  return v as Record<string, unknown>;
}
