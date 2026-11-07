// TIP-025b §B.3 — đoạn trích kết quả tìm: tô bằng <mark> đúng chuỗi gốc theo ranges UTF-16 (emoji / NFD), không chèn HTML thô;
// thân dài cắt quanh lần khớp đầu kèm dấu ….
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { foldRanges } from '@appchat/shared';
import { HitSnippet } from './HitSnippet';

describe('HitSnippet', () => {
  afterEach(cleanup);

  it('emoji + NFD: <mark> đúng phần khớp; thẻ HTML trong thân hiện như chữ', () => {
    const body = `😀 <b>x</b> ${'Báo giá triệt lông'.normalize('NFD')}`;
    render(<HitSnippet body={body} ranges={foldRanges(body, 'triet long')} />);
    const marks = screen.getByTestId('thread-search-snippet').querySelectorAll('mark');
    expect([...marks].map((m) => m.textContent!.normalize('NFC'))).toEqual(['triệt lông']);
    expect(screen.getByTestId('thread-search-snippet').querySelector('b')).toBeNull();
    expect(screen.getByTestId('thread-search-snippet').textContent).toContain('<b>x</b>');
  });

  it('thân dài → cắt quanh lần khớp, có …', () => {
    const body = `${'a'.repeat(300)} triệt lông ${'b'.repeat(300)}`;
    render(<HitSnippet body={body} ranges={foldRanges(body, 'triet long')} />);
    const t = screen.getByTestId('thread-search-snippet').textContent!;
    expect(t.startsWith('…')).toBe(true);
    expect(t.endsWith('…')).toBe(true);
    expect(t.length).toBeLessThan(200);
  });
});
