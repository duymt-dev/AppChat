// Mẫu tệp cho model (TIP-038b P3, DC-374): Trợ lý chỉ thấy tên cột + ≤ 20 dòng mẫu đã che — đủ để nhận ra "cột này là SĐT / ngày / tiền"
// nhưng không đọc được liên hệ thật: email → `a***@d***.vn`, chuỗi ≥ 6 chữ số (SĐT, số tài khoản, CCCD) → giữ 2 số đầu + `•` + 2 số cuối,
// ô dài cắt 60 ký tự. Số tiền viết nhóm nghìn giữ nguyên. Chữ trong ô là DỮ LIỆU (prompt dặn không làm theo) — che không thay đổi điều đó.
import { TRANSFER_AI_SAMPLE_ROWS } from '@appchat/shared';

const EMAIL = /([^\s@])[^\s@]*@([^\s@.])[^\s@]*(\.[^\s@]+)/g;
const DIGITS = /\+?\d[\d .-]{4,}\d/g;
const CELL_MAX = 60;
const MONEY = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/;

/** Che một ô: email, chuỗi số dài (≥ 6 chữ số). Ô rỗng giữ rỗng. */
export function maskCell(v: string): string {
  const t = v.trim().slice(0, CELL_MAX);
  return t.replace(EMAIL, '$1***@$2***$3').replace(DIGITS, (m) => {
    const d = m.replace(/\D/g, '');
    // Số tiền viết nhóm nghìn (1.250.000 / 1,250,000) giữ nguyên — model cần nhận ra cột tiền; SĐT / số định danh thì che.
    if (d.length < 6 || MONEY.test(m.trim())) return m;
    return `${d.slice(0, 2)}${'•'.repeat(d.length - 4)}${d.slice(-2)}`;
  });
}

/** ≤ 20 dòng không rỗng đầu tiên, đã che. */
export const maskedSample = (rows: string[][]) =>
  rows
    .filter((r) => r.some((c) => c.trim()))
    .slice(0, TRANSFER_AI_SAMPLE_ROWS)
    .map((r) => r.map(maskCell));
