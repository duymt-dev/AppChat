// Payload VietQR (chuẩn NAPAS — EMVCo MPM): chuyển khoản nhanh 24/7 tới tài khoản DN, số tiền + nội dung = mã đề nghị (COMMERCE §5).
// Thuần hàm, dùng chung web (hiển thị QR) và core (đính vào tin nhắn / PDF).

export interface VietQrInput {
  /** Mã BIN ngân hàng NAPAS (6 số), ví dụ Vietcombank 970436. */
  bin: string;
  account_no: string;
  /** Số tiền VND (string). Bỏ trống → QR tĩnh, khách tự nhập. */
  amount?: string;
  /** Nội dung chuyển khoản — mã khớp tự động, ví dụ TT002041. */
  content?: string;
}

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — trường 63 của EMVCo. */
export const crc16 = (s: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

/** Nội dung CK chỉ giữ A–Z, 0–9, khoảng trắng (ngân hàng bỏ dấu / ký tự lạ), tối đa 25 ký tự. */
export const transferContent = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .slice(0, 25);

export const vietQrPayload = ({ bin, account_no, amount, content }: VietQrInput): string => {
  const dynamic = !!amount && Number(amount) > 0;
  const merchant = tlv('00', 'A000000727') + tlv('01', tlv('00', bin) + tlv('01', account_no)) + tlv('02', 'QRIBFTTA');
  const body =
    tlv('00', '01') +
    tlv('01', dynamic ? '12' : '11') +
    tlv('38', merchant) +
    tlv('53', '704') +
    (dynamic ? tlv('54', String(Number(amount))) : '') +
    tlv('58', 'VN') +
    (content ? tlv('62', tlv('08', transferContent(content))) : '') +
    '6304';
  return body + crc16(body);
};
