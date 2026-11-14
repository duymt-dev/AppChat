// TIP-023c (D55): prompt `genui` v4 (TIP-012c: khoá dán vào chat không lặp / không điền, kiểm tra kết nối bằng integration.test; G3: form_schema chỉ cho connector, email render form ngay, id màn đang mở dùng thẳng, cấu hình nhanh sau QR, quản lý kênh) trong registry khớp từng chữ file .md; có luật số liệu chỉ qua $ref, không điền sẵn ô bí mật,
// khối đóng, QR qua channel.status; thay biến {surface} / {screen}.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROMPTS, prompt } from '../src';

const md = (locale: string) => readFileSync(new URL(`../src/prompts/genui.${locale}.md`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('prompt genui', () => {
  it('version 4 ở vi / en; registry khớp file .md', () => {
    for (const locale of ['vi', 'en'] as const) {
      const [head, ...body] = md(locale).trimEnd().split('\n');
      expect(head).toBe(`<!-- prompt: genui · version: 4 · locale: ${locale} -->`);
      expect(body.join('\n')).toBe(PROMPTS.genui![locale].text);
      expect(PROMPTS.genui![locale].version).toBe(4);
    }
  });

  it('luật cốt lõi + thay biến', () => {
    const vi = prompt('genui', 'vi', { surface: 'drawer', screen: 'customers' }).text;
    expect(vi).toContain('Khung đang hiện: drawer · màn: customers');
    expect(vi).toContain('$ref');
    expect(vi).toContain('KHÔNG BAO GIỜ điền giá trị');
    expect(vi).toContain('channel.status');
    expect(vi).toContain('integration.form_schema');
    expect(vi).toContain('channel.update_settings');
    expect(vi).toContain('KHÔNG gọi `integration.form_schema` cho email');
    expect(vi).toContain('dùng thẳng làm `<entity>_id`');
    expect(vi).not.toMatch(/\{(surface|screen)\}/);
    const en = prompt('genui', 'en', { surface: 'assistant', screen: 'inbox' }).text;
    expect(en).toContain('NEVER prefill');
    expect(en).toContain('Allowed blocks only');
  });
});
