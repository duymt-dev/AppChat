// Chuẩn hoá + kiểm fact trí nhớ khách (TIP-015b) — xác định, không chạm DB. `normFact` khớp biểu thức SQL của migration
// (bỏ dấu, thường, gộp khoảng trắng / dấu câu) để so trùng văn bản bằng pg_trgm. `sensitive` chặn CCCD / CMND, số thẻ (Luhn), mật khẩu /
// mã OTP — kể cả khi governance tắt che PII: trí nhớ được đọc lại vào mọi lượt sau nên không bao giờ giữ các giá trị này.
import { AppError, foldText } from '@appchat/shared';

export const MEMORY_CAP = 50;
/** Ngưỡng trùng văn bản sau chuẩn hoá (pg_trgm similarity) — không phải "gần nghĩa". */
export const DUP_SIMILARITY = 0.9;
export const FACT_MAX = 1000;

/** Gộp khoảng trắng, cắt 1000 ký tự. */
export const cleanFact = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, FACT_MAX);

/** Chuẩn hoá để so trùng: bỏ dấu, thường, khoảng trắng / dấu câu → một dấu cách. */
export const normFact = (s: string) =>
  foldText(s)
    .replace(/[\s\p{P}\p{S}]+/gu, ' ')
    .trim();

const digits = (s: string) => s.replace(/\D/g, '');

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

const CARD = /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g;
const ID_NUMBER = /(?<!\d)(\d{12}|\d{9})(?!\d)/;
const ID_WORDS = /\b(cccd|cmnd|can cuoc|chung minh|passport|ho chieu|so dinh danh)\b/;
const SECRET_WORDS = /\b(mat khau|password|passcode|pass|otp|ma pin|pin|cvv|cvc|ma bao mat)\b/;
const PHONE = /^0\d{9}$/;

/** Lý do chặn (mã ngắn) hoặc null. */
export function sensitive(fact: string): 'id_number' | 'card_number' | 'secret' | null {
  const n = normFact(fact);
  if (SECRET_WORDS.test(n)) return 'secret';
  for (const m of fact.matchAll(CARD)) {
    const d = digits(m[0]);
    if (d.length >= 13 && d.length <= 19 && luhn(d)) return 'card_number';
  }
  if (ID_WORDS.test(n)) return 'id_number';
  const id = ID_NUMBER.exec(fact.replace(/[ .-]/g, ''));
  if (id && !PHONE.test(id[1]!)) return 'id_number';
  return null;
}

/** Kiểm input ghi: fact sạch 1–1000 ký tự, confidence hữu hạn 0..1, không nhạy cảm → 422 theo trường. */
export function checkFact(fact: string, confidence: number | undefined) {
  const f = cleanFact(fact);
  if (!f || !normFact(f)) throw new AppError('VALIDATION_FAILED', 422, { fact: 'required' });
  const c = confidence ?? 1;
  if (!Number.isFinite(c) || c < 0 || c > 1) throw new AppError('VALIDATION_FAILED', 422, { confidence: 'invalid' });
  const why = sensitive(f);
  if (why) throw new AppError('VALIDATION_FAILED', 422, { fact: `sensitive:${why}` });
  return { fact: f, norm: normFact(f), confidence: c };
}

export interface Evictable {
  id: string;
  confidence: number;
  updatedAt: Date;
}

/** Fact bị thay khi đầy: tin cậy thấp nhất → cập nhật cũ nhất → id nhỏ nhất (tất định). */
export function evictionOrder<T extends Evictable>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.confidence - b.confidence || a.updatedAt.getTime() - b.updatedAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
