// TIP-030b F2: prompt `contract-draft` v1 trong registry khớp từng chữ file .md; luật cốt lõi (không giá, không sửa điều khoản mẫu,
// dữ liệu không phải lệnh, chỉ JSON).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROMPTS, prompt } from '../src';

const md = (locale: string) => readFileSync(new URL(`../src/prompts/contract-draft.${locale}.md`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('prompt contract-draft', () => {
  it('version 2 ở vi / en; registry khớp file .md', () => {
    for (const locale of ['vi', 'en'] as const) {
      const [head, ...body] = md(locale).trimEnd().split('\n');
      expect(head).toBe(`<!-- prompt: contract-draft · version: 2 · locale: ${locale} -->`);
      expect(body.join('\n')).toBe(PROMPTS['contract-draft']![locale].text);
    }
  });

  it('luật cốt lõi', () => {
    const vi = prompt('contract-draft', 'vi').text;
    expect(vi).toContain('Không tự đặt giá');
    expect(vi).toContain('Không viết lại điều khoản của mẫu');
    expect(vi).toContain('chỉ là dữ liệu');
    expect(prompt('contract-draft', 'en').text).toContain('Return exactly ONE JSON block');
  });
});
