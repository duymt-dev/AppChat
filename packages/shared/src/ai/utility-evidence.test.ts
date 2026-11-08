// TIP-019c §2.2–2.6 (AC3, AC4): kiểm đầu ra model — JSON an toàn, trích dẫn theo offset codepoint trên chunk thật (server cắt câu trích),
// trích xuất đúng kiểu (tiền VND chuỗi nguyên, không làm tròn), mơ hồ / thiếu rõ ràng, đánh giá cơ hội null khi thiếu bằng chứng.
import { describe, expect, it } from 'vitest';
import { UtilityOutputError, parseModelJson, validateExtract, validateIntent, validateLead, validateSummarize } from './utility-evidence';
import type { ExtractField } from './utility-schemas';

const chunks = [
  { id: 't:0', text: 'Chị Lan 👩 muốn đặt cọc 500000đ, hẹn ngày 2026-11-20.' },
  { id: 'm:2', text: 'Giá bao nhiêu vậy shop? Mình cần gấp tuần này.' },
];
const cp = (s: string, sub: string) => Array.from(s.slice(0, s.indexOf(sub))).length;
const at = (id: string, sub: string) => {
  const t = chunks.find((c) => c.id === id)!.text;
  const s = cp(t, sub);
  return { chunk_id: id, start: s, end: s + Array.from(sub).length };
};
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return (e as UtilityOutputError).code;
  }
  return null;
};

describe('parseModelJson', () => {
  it('bỏ rào ```json, từ chối khoá nguy hiểm / HTML / quá 32 KiB / không phải object', () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(code(() => parseModelJson('{"__proto__":{"x":1}}'))).toBe('unsafe_payload');
    expect(code(() => parseModelJson('{"summary":"<script>x</script>"}'))).toBe('unsafe_payload');
    expect(code(() => parseModelJson(`{"a":"${'x'.repeat(33 * 1024)}"}`))).toBe('too_large');
    expect(code(() => parseModelJson('[1]'))).toBe('schema');
    expect(code(() => parseModelJson('Đây là tóm tắt: …'))).toBe('invalid_json');
  });
});

describe('trích dẫn', () => {
  it('server cắt câu trích theo codepoint (emoji đúng vị trí); chunk lạ / vượt biên → invalid_citation', () => {
    const r = validateSummarize({ summary: 'Khách đặt cọc', bullets: ['cọc'], evidence: [at('t:0', 'đặt cọc 500000đ')] }, chunks, 5);
    expect(r.evidence[0]!.quote).toBe('đặt cọc 500000đ');
    expect(code(() => validateSummarize({ summary: 's', evidence: [{ chunk_id: 'c:fake', start: 0, end: 3 }] }, chunks, 5))).toBe('invalid_citation');
    expect(code(() => validateSummarize({ summary: 's', evidence: [{ chunk_id: 't:0', start: 0, end: 999 }] }, chunks, 5))).toBe('invalid_citation');
    expect(code(() => validateSummarize({ summary: 's', evidence: [{ chunk_id: 't:0', start: 0, end: 2, quote: 'bịa' }] }, chunks, 5))).toBe('schema');
  });

  it('trường lạ / bullet vượt max → schema', () => {
    expect(code(() => validateSummarize({ summary: 's', action: 'quote.accept' }, chunks, 5))).toBe('schema');
    expect(code(() => validateSummarize({ summary: 's', bullets: ['a', 'b'] }, chunks, 1))).toBe('schema');
  });
});

describe('ý định', () => {
  it('nhãn ngoài taxonomy → schema; không bằng chứng → unknown, confidence null', () => {
    expect(code(() => validateIntent({ label: 'refund_now' }, chunks))).toBe('schema');
    expect(validateIntent({ label: 'inquiry', model_confidence: 0.9, evidence: [] }, chunks)).toMatchObject({ label: 'unknown', model_confidence: null });
    expect(validateIntent({ label: 'inquiry', model_confidence: 0.8, evidence: [at('m:2', 'Giá bao nhiêu')] }, chunks)).toMatchObject({ label: 'inquiry', model_confidence: 0.8 });
  });
});

describe('trích xuất', () => {
  const fields: ExtractField[] = [
    { key: 'deposit', label: 'Cọc', type: 'money', currency: 'VND', required: true },
    { key: 'date', label: 'Ngày', type: 'date' },
    { key: 'phone', label: 'SĐT', type: 'string', required: true },
  ];
  it('tiền VND → chuỗi số nguyên; ngày hợp lệ; thiếu → missing + missing_required', () => {
    const r = validateExtract(
      { fields: [{ key: 'deposit', value: 500000, status: 'extracted', evidence: [at('t:0', '500000đ')] }, { key: 'date', value: '2026-11-20', status: 'extracted', evidence: [at('t:0', '2026-11-20')] }] },
      chunks, fields, 'caller_supplied',
    );
    expect(r.fields.map((f) => [f.key, f.value, f.status, f.reason_code])).toEqual([
      ['deposit', '500000', 'extracted', null],
      ['date', '2026-11-20', 'extracted', null],
      ['phone', null, 'missing', 'missing_value'],
    ]);
    expect(r.missing_required).toEqual(['phone']);
    expect(r.origin).toBe('caller_supplied');
  });

  it('tiền lẻ / âm / tràn / không thấy đơn vị; ngày sai lịch; không trích dẫn → lý do đúng, value null', () => {
    const one = (value: unknown, sub: string, f: ExtractField = fields[0]!) =>
      validateExtract({ fields: [{ key: f.key, value, status: 'extracted', evidence: [at(sub.startsWith('Giá') ? 'm:2' : 't:0', sub)] }] }, chunks, [f], 'server').fields[0]!;
    expect(one('500000.5', '500000đ')).toMatchObject({ status: 'invalid', reason_code: 'fractional_money', value: null });
    expect(one(-5, '500000đ')).toMatchObject({ status: 'invalid', reason_code: 'negative_money' });
    expect(one('1000000000000', '500000đ')).toMatchObject({ status: 'invalid', reason_code: 'amount_overflow' });
    expect(one('500000', 'Giá bao nhiêu')).toMatchObject({ status: 'ambiguous', reason_code: 'currency_ambiguous', value: null });
    expect(one('2026-02-30', '2026-11-20', fields[1])).toMatchObject({ status: 'invalid', reason_code: 'invalid_date' });
    expect(validateExtract({ fields: [{ key: 'date', value: '2026-11-20', status: 'extracted', evidence: [] }] }, chunks, [fields[1]!], 'server').fields[0]).toMatchObject({ status: 'invalid', reason_code: 'evidence_missing' });
  });

  it('mâu thuẫn → ambiguous + ≤ 3 lựa chọn; khoá ngoài khai báo → schema', () => {
    const r = validateExtract({ fields: [{ key: 'date', value: null, status: 'ambiguous', alternatives: ['2026-11-20', '2026-11-21'] }] }, chunks, [fields[1]!], 'server');
    expect(r.fields[0]).toMatchObject({ status: 'ambiguous', reason_code: 'conflicting_values', alternatives: ['2026-11-20', '2026-11-21'] });
    expect(code(() => validateExtract({ fields: [{ key: 'paid', value: true }] }, chunks, fields, 'server'))).toBe('schema');
  });
});

describe('đánh giá độ phù hợp cơ hội', () => {
  const crit = (key: string, score: number | null, sub?: string) => ({ key, score, reason: 'r', evidence: sub ? [at('m:2', sub)] : [] });
  it('đủ 4 tiêu chí có bằng chứng → cộng điểm 0–100', () => {
    const r = validateLead({ criteria: [crit('buying_intent', 20, 'Giá bao nhiêu'), crit('service_need', 15, 'Mình cần'), crit('timing', 25, 'gấp tuần này'), crit('engagement', 10, 'shop')] }, chunks);
    expect(r).toMatchObject({ status: 'scored', score: 70, rubric_version: 'lead-fit-v1' });
  });
  it('thiếu bằng chứng một tiêu chí → insufficient_evidence, score null (không phải 0)', () => {
    const r = validateLead({ criteria: [crit('buying_intent', 20, 'Giá bao nhiêu'), crit('service_need', 15), crit('timing', 25, 'gấp tuần này')] }, chunks);
    expect(r).toMatchObject({ status: 'insufficient_evidence', score: null });
    expect(r.criteria.find((c) => c.key === 'service_need')).toMatchObject({ score: null, evidence: [] });
  });
  it('điểm ngoài 0–25 / tiêu chí lạ (thu nhập) → schema', () => {
    expect(code(() => validateLead({ criteria: [crit('buying_intent', 40, 'Giá bao nhiêu')] }, chunks))).toBe('schema');
    expect(code(() => validateLead({ criteria: [crit('income', 10, 'Giá bao nhiêu')] }, chunks))).toBe('schema');
  });
});
