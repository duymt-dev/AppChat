// TIP-022b: prompt `agent-reply` v2 trong registry khớp từng chữ file .md (vi / en cùng phiên bản); luật mới — ý định đóng, tệp không đọc
// được, báo giá chỉ chấp nhận khi khách nói rõ, đổi lịch cần giờ cụ thể, kết quả chờ duyệt chưa phải xong.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PROMPTS, prompt } from '../src';

const md = (locale: string) => readFileSync(new URL(`../src/prompts/agent-reply.${locale}.md`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

describe('prompt agent-reply', () => {
  it('version 3 ở vi / en; registry khớp file .md', () => {
    for (const locale of ['vi', 'en'] as const) {
      const [head, ...body] = md(locale).trimEnd().split('\n');
      expect(head).toBe(`<!-- prompt: agent-reply · version: 3 · locale: ${locale} -->`);
      expect(body.join('\n')).toBe(PROMPTS['agent-reply']![locale].text);
      expect(PROMPTS['agent-reply']![locale].version).toBe(3);
    }
  });

  it('luật hành vi kênh (vi / en song song)', () => {
    const vi = prompt('agent-reply', 'vi').text;
    const en = prompt('agent-reply', 'en').text;
    for (const k of ['`buy`', '`question`', '`complaint`', '`booking`', '`other`', 'attachment_unreadable']) {
      expect(vi).toContain(k);
      expect(en).toContain(k);
    }
    expect(vi).toContain('KHÔNG phải chấp nhận');
    expect(en).toContain('is NOT acceptance');
    expect(vi).toContain('nghĩa là CHƯA xong');
    expect(en).toContain('means NOT done yet');
    expect(vi.split('\n').length).toBe(en.split('\n').length);
  });
});
