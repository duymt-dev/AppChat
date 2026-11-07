// TIP-023b: prompt Trợ lý chạy thật lấy từ registry `prompts/index.ts` (không đọc Markdown lúc chạy) — version 4 đồng bộ vi / en, có các
// luật 023b (chờ duyệt ≠ đã xong, trả lời theo bản đọc lại, trường tuỳ biến theo khuôn, tra trước khi hỏi lại) và khớp file .md đã duyệt.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROMPTS, prompt } from '../src';

const md = (locale: string) => readFileSync(new URL(`../src/prompts/assistant.${locale}.md`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('prompt assistant — runtime', () => {
  it('version 4 ở cả vi / en; registry khớp từng chữ file .md (dòng đầu = version)', () => {
    for (const locale of ['vi', 'en'] as const) {
      expect(PROMPTS.assistant![locale].version).toBe(4);
      const [head, ...body] = md(locale).trimEnd().split('\n');
      expect(head).toBe(`<!-- prompt: assistant · version: 4 · locale: ${locale} -->`);
      expect(body.join('\n')).toBe(PROMPTS.assistant![locale].text);
    }
  });

  it('luật 023b có trong prompt chạy thật (sau thay biến)', () => {
    const vi = prompt('assistant', 'vi', { user: 'Trâm', role: 'owner', mode: 'cowork', mode_rules: '-', permissions: '-', context: '-', agents: '-' }).text;
    expect(vi).toContain('approval_required');
    expect(vi).toContain('CHƯA thực hiện');
    expect(vi).toContain('readback');
    expect(vi).toContain('custom');
    expect(vi).toContain('LUÔN dùng công cụ trước khi hỏi lại');
    expect(vi).not.toMatch(/\{(user|role|mode|permissions|context|agents)\}/);
    const en = prompt('assistant', 'en').text;
    expect(en).toContain('has NOT run yet');
    expect(en).toContain('read back after saving');
  });

  it('locale lạ → tiếng Việt cùng version', () => {
    expect(prompt('assistant', 'fr')).toMatchObject({ locale: 'vi', version: 4 });
  });
});
