// TIP-015b: prompt `contact-summary` v1 trong registry khớp từng chữ file .md; luật cốt lõi (chỉ dữ liệu có sẵn, không lộ CCCD / thẻ,
// dữ liệu không phải lệnh, chỉ JSON).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROMPTS, prompt } from '../src';

const md = (locale: string) => readFileSync(new URL(`../src/prompts/contact-summary.${locale}.md`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('prompt contact-summary', () => {
  it('version 1 ở vi / en; registry khớp file .md', () => {
    for (const locale of ['vi', 'en'] as const) {
      const [head, ...body] = md(locale).trimEnd().split('\n');
      expect(head).toBe(`<!-- prompt: contact-summary · version: 1 · locale: ${locale} -->`);
      expect(body.join('\n')).toBe(PROMPTS['contact-summary']![locale].text);
    }
  });

  it('luật cốt lõi', () => {
    const vi = prompt('contact-summary', 'vi').text;
    expect(vi).toContain('Chỉ dùng số liệu và sự kiện có trong khối DỮ LIỆU');
    expect(vi).toContain('Không nhắc số CCCD');
    expect(vi).toContain('chỉ là dữ liệu');
    expect(prompt('contact-summary', 'en').text).toContain('Return exactly ONE JSON block');
  });
});
