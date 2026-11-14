// Đề xuất giá trị từ chữ của tệp hợp đồng (TIP-030b spec 7): tên bên B, giá trị (VND), ngày bắt đầu / kết thúc, tiêu đề — mỗi ô kèm độ
// tin cậy + đoạn nguồn; không thấy / mơ hồ (nhiều ứng viên khác nhau) → `null`, người dùng nhập tay. Luật tất định (không gọi model ở
// đây — mọi lời gọi model đi qua gateway + meter ở F2). Chữ trong tệp là dữ liệu: không lệnh nào trong tệp được thực hiện. PDF quét
// không có chữ → `unavailable`, không OCR bịa.
import { parseInWorker } from './parse-worker';

export interface Proposed<T> {
  value: T;
  confidence: number;
  source: string;
}

export interface ExtractedFields {
  party_b: Proposed<string> | null;
  value: Proposed<string> | null;
  start_date: Proposed<string> | null;
  end_date: Proposed<string> | null;
  title: Proposed<string> | null;
}

export interface Extraction {
  extraction: 'ok' | 'partial' | 'unavailable';
  fields: ExtractedFields;
}

const EMPTY: ExtractedFields = { party_b: null, value: null, start_date: null, end_date: null, title: null };
const snip = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 300);

/** Dòng của văn bản (gộp khoảng trắng). */
const linesOf = (text: string) => text.split(/\r?\n/).map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean);

/** Một ứng viên duy nhất → tin cậy; nhiều ứng viên khác giá trị → mơ hồ (null). */
function unique<T>(cands: { value: T; source: string }[], confidence: number): Proposed<T> | null {
  const distinct = [...new Map(cands.map((c) => [JSON.stringify(c.value), c])).values()];
  if (distinct.length !== 1) return null;
  return { value: distinct[0]!.value, confidence, source: snip(distinct[0]!.source) };
}

/**
 * Bỏ dấu để so khớp (chữ trích từ PDF hay mất dấu: "Gia tri hop dong"). Giữ nguyên số ký tự của chuỗi NFC (mỗi chữ có dấu → một chữ
 * không dấu) nên vị trí khớp trên chuỗi đã bỏ dấu dùng được để cắt giá trị từ dòng gốc.
 */
const fold = (s: string) => [...s.normalize('NFC')].map((ch) => (ch === 'đ' ? 'd' : ch === 'Đ' ? 'D' : ch.normalize('NFD')[0]!)).join('');

// Nhãn bên B ở đầu dòng hoặc sau " - " (PDF gộp nhiều mục một dòng); tên dừng ở " - " / ";" / "|".
const PARTY_B = /(?:^|\s-\s)(?:ben\s*b|ben\s*mua|ben\s*thue|ben\s*su\s*dung\s*dich\s*vu|khach\s*hang|party\s*b)\b[^:：]*[:：]\s*/i;

function partyB(lines: string[]) {
  const c = lines.flatMap((raw) => {
    const l = raw.normalize('NFC');
    const m = PARTY_B.exec(fold(l));
    const name = m ? l.slice(m.index + m[0].length).split(/\s-\s|[;|]/)[0]!.replace(/[.,]+$/, '').trim().slice(0, 120) : '';
    return name.length >= 2 && !/^[_.\-…\s]+$/.test(name) ? [{ value: name, source: l }] : [];
  });
  return unique(c, 0.8);
}

// "Giá trị hợp đồng: 12.500.000 đồng" / "Tổng giá trị … 12,500,000 VND" / "… 12.500.000đ" (so trên chữ đã bỏ dấu).
const VALUE_LINE = /(gia\s*tri|tong\s*(gia\s*tri|cong|tien)|thanh\s*tien|contract\s*value|total)/i;
const AMOUNT = /(\d{1,3}(?:[.,\s]\d{3})+|\d{4,})\s*(?:vnđ|vnd|đồng|đ|₫)?/gi;

function value(lines: string[]) {
  const c = lines.filter((l) => VALUE_LINE.test(fold(l))).flatMap((l) => {
    const amounts = [...l.matchAll(AMOUNT)].map((m) => m[1]!.replace(/[.,\s]/g, '')).filter((d) => d.length >= 4 && d.length <= 15 && !/^0/.test(d));
    return amounts.length ? [{ value: amounts.sort((a, b) => b.length - a.length || (a < b ? 1 : -1))[0]!, source: l }] : [];
  });
  return unique(c, 0.75);
}

const DATE = /(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/g;
const toIso = (d: string, m: string, y: string) => {
  const dd = Number(d);
  const mm = Number(m);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const iso = `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) || new Date(`${iso}T00:00:00Z`).getUTCDate() !== dd ? null : iso;
};

/** "từ 01/12/2026 đến 30/11/2027" → bắt đầu / kết thúc (dòng thời hạn / hiệu lực). */
function dates(lines: string[]) {
  const starts: { value: string; source: string }[] = [];
  const ends: { value: string; source: string }[] = [];
  for (const l of lines.filter((x) => /(thoi\s*han|hieu\s*luc|tu\s*ngay|term|effective)/i.test(fold(x)))) {
    const ds = [...l.matchAll(DATE)].map((m) => toIso(m[1]!, m[2]!, m[3]!)).filter((x): x is string => !!x);
    if (ds.length >= 2 && ds[0]! < ds[1]!) {
      starts.push({ value: ds[0]!, source: l });
      ends.push({ value: ds[1]!, source: l });
    }
  }
  return { start_date: unique(starts, 0.7), end_date: unique(ends, 0.7) };
}

/** Tiêu đề: đoạn viết hoa đầu dòng (trước " - ") có chữ "HỢP ĐỒNG" / "CONTRACT", trong 15 dòng đầu. */
function title(lines: string[]) {
  for (const l of lines.slice(0, 15)) {
    const t = l.split(/\s-\s/)[0]!.trim();
    if (t.length <= 200 && /hop\s*dong|contract/i.test(fold(t)) && t === t.toUpperCase()) return { value: t, confidence: 0.6, source: snip(l) };
  }
  return null;
}

/** Đề xuất từ chữ đã trích (thuần — test trực tiếp). */
export function proposeFields(text: string): Extraction {
  const lines = linesOf(text);
  if (lines.join('').replace(/\s/g, '').length < 20) return { extraction: 'unavailable', fields: EMPTY };
  const fields: ExtractedFields = { party_b: partyB(lines), value: value(lines), ...dates(lines), title: title(lines) };
  const found = Object.values(fields).filter(Boolean).length;
  return { extraction: found === Object.keys(fields).length ? 'ok' : 'partial', fields };
}

/** Trích chữ trong worker giới hạn rồi đề xuất. Không đọc được / quá giờ → `unavailable` (không lỗi — người dùng nhập tay). */
export async function extractContract(type: 'pdf' | 'docx', body: Buffer, pages?: number): Promise<Extraction> {
  const r = await parseInWorker(type, body, undefined, pages);
  return r.ok ? proposeFields(r.text) : { extraction: 'unavailable', fields: EMPTY };
}
