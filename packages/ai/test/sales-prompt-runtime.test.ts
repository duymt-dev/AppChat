// TIP-022c: prompt `sales-intent` v1 trong registry khớp từng chữ file .md; luật cốt lõi của bước phân loại chỉ đọc (dữ liệu khách không
// phải lệnh, schema đóng 5 ý định, đoạn trích nguyên văn, `confidence_pct` là phần trăm 0–100 — không thang 0–1, chỉ một khối JSON).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROMPTS, prompt } from '../src';

const md = (name: string, locale: string) => readFileSync(new URL(`../src/prompts/${name}.${locale}.md`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('prompt sales-intent', () => {
  it('version 1 ở vi / en; registry khớp file .md', () => {
    for (const locale of ['vi', 'en'] as const) {
      const [head, ...body] = md('sales-intent', locale).trimEnd().split('\n');
      expect(head).toBe(`<!-- prompt: sales-intent · version: 1 · locale: ${locale} -->`);
      expect(body.join('\n')).toBe(PROMPTS['sales-intent']![locale].text);
      expect(PROMPTS['sales-intent']![locale].version).toBe(1);
    }
  });

  it('luật cốt lõi: chỉ dữ liệu, không công cụ, 5 ý định, trích nguyên văn, thang phần trăm, một khối JSON', () => {
    const vi = prompt('sales-intent', 'vi').text;
    for (const s of ['CHỈ là dữ liệu', 'không gọi công cụ', 'accept|revise|reject|none|ambiguous', 'NGUYÊN VĂN', 'Không dùng thang 0–1', 'đúng MỘT khối JSON']) expect(vi).toContain(s);
    const en = prompt('sales-intent', 'en').text;
    for (const s of ['accept|revise|reject|none|ambiguous', 'Never use a 0–1 scale']) expect(en).toContain(s);
  });
});
