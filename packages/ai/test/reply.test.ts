// TIP-022 AC2 (unit): che / khôi phục PII, đọc output có cấu trúc của agent trực kênh, luật chuyển sang người, kho prompt có version.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROMPTS, PiiMasker, decideHandoff, parseAgentReply, prompt, unmaskPii, type HandoffInput } from '../src';

describe('PII', () => {
  it('che CCCD 12 số / CMND 9 số, thẻ 16 số có dấu cách (Luhn), STK; giữ SĐT và tiền', () => {
    const m = new PiiMasker();
    const out = m.mask('CCCD 079203001234, CMND 123456789, thẻ 4111 1111 1111 1111, STK: 0123456789012, sđt 0912345678, giá 1500000đ, mã đơn 1234567890123');
    expect(out).toBe('CCCD [PII_3], CMND [PII_4], thẻ [PII_2], STK: [PII_1], sđt 0912345678, giá 1500000đ, mã đơn 1234567890123');
    expect(m.map['[PII_1]']).toBe('0123456789012');
    expect(m.map['[PII_2]']).toBe('4111 1111 1111 1111');
    expect(m.map['[PII_3]']).toBe('079203001234');
  });

  it('cùng giá trị → cùng mã; khôi phục trong chuỗi và object lồng nhau; bảng nạp lại tiếp tục đánh số', () => {
    const m = new PiiMasker();
    expect(m.mask('079203001234 và 079203001234')).toBe('[PII_1] và [PII_1]');
    expect(unmaskPii({ note: 'số [PII_1]', list: ['[PII_1]', '[PII_9]'] }, m.map)).toEqual({ note: 'số 079203001234', list: ['079203001234', '[PII_9]'] });
    const again = new PiiMasker(m.map);
    expect(again.mask('CMND 123456789')).toBe('CMND [PII_2]');
  });
});

describe('output có cấu trúc', () => {
  it('JSON trong ```json kèm chữ; confidence phần trăm → 0–1; reply rỗng → null', () => {
    const r = parseAgentReply('Dạ em xem rồi:\n```json\n{"reply":" Spa mở 8h–20h ","confidence":85,"intent":"hours","sentiment":"neutral","needs_human":null}\n```');
    expect(r).toEqual({ ok: true, reply: 'Spa mở 8h–20h', confidence: 0.85, intent: 'hours', sentiment: 'neutral', needs_human: null });
    expect(parseAgentReply('{"reply":"","confidence":0.9}').reply).toBeNull();
  });

  it('không có JSON / JSON lỗi → ok=false, độ tin cậy 0; giá trị lạ → mặc định an toàn', () => {
    expect(parseAgentReply('Dạ em chào chị')).toMatchObject({ ok: false, confidence: 0 });
    expect(parseAgentReply('{"reply": "x", ')).toMatchObject({ ok: false });
    expect(parseAgentReply('{"reply":"x","confidence":"cao","sentiment":"angry"}')).toMatchObject({ ok: true, confidence: 0, sentiment: 'neutral' });
  });
});

describe('luật chuyển sang người', () => {
  const base = (o: Partial<HandoffInput> = {}): HandoffInput => ({
    out: { ok: true, reply: 'Dạ spa mở cửa 8h', confidence: 0.9, intent: 'hours', sentiment: 'neutral', needs_human: null },
    threshold: 70,
    lastCustomerFolded: 'spa mo cua may gio',
    previousCustomerFolded: [],
    banned: [],
    replyFolded: 'da spa mo cua 8h',
    ...o,
  });

  it('đủ tin cậy → gửi; dưới ngưỡng → low_confidence; đúng ngưỡng vẫn gửi', () => {
    expect(decideHandoff(base())).toBeNull();
    expect(decideHandoff(base({ out: { ...base().out, confidence: 0.69 } }))).toBe('low_confidence');
    expect(decideHandoff(base({ out: { ...base().out, confidence: 0.7 } }))).toBeNull();
  });

  it('đòi gặp người / khiếu nại / sentiment tiêu cực / từ cấm (khách hoặc câu trả lời) / lặp 3 lần / needs_human / không đọc được', () => {
    expect(decideHandoff(base({ lastCustomerFolded: 'cho toi gap nhan vien' }))).toBe('asked_human');
    expect(decideHandoff(base({ lastCustomerFolded: 'toi muon khieu nai' }))).toBe('complaint');
    expect(decideHandoff(base({ out: { ...base().out, sentiment: 'negative' } }))).toBe('complaint');
    expect(decideHandoff(base({ banned: ['cam ket khoi benh'], replyFolded: 'da cam ket khoi benh 100%' }))).toBe('banned_word');
    expect(decideHandoff(base({ previousCustomerFolded: ['spa mo cua may gio?', 'spa mo cua may gio'] }))).toBe('repeated');
    expect(decideHandoff(base({ previousCustomerFolded: ['spa mo cua may gio', 'gia bao nhieu'] }))).toBeNull();
    expect(decideHandoff(base({ out: { ...base().out, needs_human: 'ngoài quyền' } }))).toBe('needs_human');
    expect(decideHandoff(base({ out: { ...base().out, ok: false } }))).toBe('unreadable');
  });
});

describe('kho prompt', () => {
  it('bản TS khớp từng chữ file .md (bỏ dòng đầu), có version; thiếu bản dịch → tiếng Việt; thay biến', () => {
    for (const name of Object.keys(PROMPTS))
      for (const locale of ['vi', 'en'] as const) {
        const md = readFileSync(new URL(`../src/prompts/${name}.${locale}.md`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
        const [head, ...body] = md.trimEnd().split('\n');
        expect(head).toBe(`<!-- prompt: ${name} · version: ${PROMPTS[name]![locale].version} · locale: ${locale} -->`);
        expect(body.join('\n')).toBe(PROMPTS[name]![locale].text);
      }
    expect(prompt('agent-reply', 'zh').locale).toBe('vi');
    expect(prompt('agent-reply', 'vi', { channel: 'Zalo', contact: 'Chị Lan', hours: '8h–20h' }).text).toContain('trực kênh Zalo của doanh nghiệp, trả lời khách Chị Lan. Giờ hoạt động: 8h–20h.');
  });
});
