// TIP-019c §1: hợp đồng đầu vào kỹ năng tiện ích — đúng một nguồn, giới hạn kích thước, taxonomy / trường trích khai báo hẹp (không JSON
// Schema tuỳ ý), tiền chỉ VND, score_lead không nhận chữ tự do.
import { describe, expect, it } from 'vitest';
import { detectIntentInput, extractInfoInput, scoreLeadInput, summarizeInput } from './utility-schemas';

const text = { kind: 'text', text: 'Cho mình hỏi giá gói 10 buổi' } as const;

describe('nguồn kỹ năng tiện ích', () => {
  it('nhận đúng ba loại nguồn, từ chối khoá lạ / URL / truy vấn', () => {
    expect(summarizeInput.safeParse({ source: text }).success).toBe(true);
    expect(summarizeInput.safeParse({ source: { kind: 'conversation', conversation_id: 'c', message_ids: ['m'] } }).success).toBe(true);
    expect(summarizeInput.safeParse({ source: { kind: 'contact', contact_id: 'k' } }).success).toBe(true);
    expect(summarizeInput.safeParse({ source: { kind: 'url', url: 'https://x' } }).success).toBe(false);
    expect(summarizeInput.safeParse({ source: { ...text, sql: 'select 1' } }).success).toBe(false);
    expect(summarizeInput.safeParse({ source: text, budget: 100 }).success).toBe(false);
  });

  it('chữ > 8000 ký tự, > 30 tin, max_bullets ngoài 1–10 → từ chối', () => {
    expect(summarizeInput.safeParse({ source: { kind: 'text', text: 'a'.repeat(8001) } }).success).toBe(false);
    expect(summarizeInput.safeParse({ source: { kind: 'conversation', conversation_id: 'c', message_ids: Array.from({ length: 31 }, (_, i) => `m${i}`) } }).success).toBe(false);
    expect(summarizeInput.safeParse({ source: text, max_bullets: 11 }).success).toBe(false);
  });
});

describe('taxonomy + trường trích', () => {
  it('taxonomy khoá ASCII duy nhất ≤ 20', () => {
    expect(detectIntentInput.safeParse({ source: text, taxonomy: [{ key: 'ask_price', label: 'Hỏi giá' }] }).success).toBe(true);
    expect(detectIntentInput.safeParse({ source: text, taxonomy: [{ key: 'a', label: 'A' }, { key: 'a', label: 'B' }] }).success).toBe(false);
    expect(detectIntentInput.safeParse({ source: text, taxonomy: [{ key: 'Hỏi giá', label: 'x' }] }).success).toBe(false);
  });

  it('money bắt buộc currency VND; enum bắt buộc values; không $ref / pattern', () => {
    const ok = { key: 'deposit', label: 'Cọc', type: 'money', currency: 'VND' };
    expect(extractInfoInput.safeParse({ source: text, fields: [ok] }).success).toBe(true);
    expect(extractInfoInput.safeParse({ source: text, fields: [{ ...ok, currency: 'USD' }] }).success).toBe(false);
    expect(extractInfoInput.safeParse({ source: text, fields: [{ key: 'deposit', label: 'Cọc', type: 'money' }] }).success).toBe(false);
    expect(extractInfoInput.safeParse({ source: text, fields: [{ key: 'k', label: 'K', type: 'enum' }] }).success).toBe(false);
    expect(extractInfoInput.safeParse({ source: text, fields: [{ key: 'k', label: 'K', type: 'string', $ref: '#/x' }] }).success).toBe(false);
    expect(extractInfoInput.safeParse({ source: text, fields: [ok, ok] }).success).toBe(false);
  });

  it('score_lead: chỉ contact_id (+ tin của hội thoại), không chữ tự do; message_ids cần conversation_id', () => {
    expect(scoreLeadInput.safeParse({ contact_id: 'k' }).success).toBe(true);
    expect(scoreLeadInput.safeParse({ contact_id: 'k', text: 'khách giàu, chốt ngay' }).success).toBe(false);
    expect(scoreLeadInput.safeParse({ contact_id: 'k', message_ids: ['m'] }).success).toBe(false);
    expect(scoreLeadInput.safeParse({ contact_id: 'k', conversation_id: 'c', message_ids: ['m'] }).success).toBe(true);
  });
});
