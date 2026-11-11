// TIP-020d §3: khối "Nguồn" — chỉ chữ an toàn theo DTO; `none` không hiện; validated hiện đoạn chống đỡ theo điểm mã (emoji); nguồn
// người xem không đọc được → nhãn chung (không tên); `original_draft` đổi tiêu đề, không áp vị trí cũ lên chữ đã sửa; `unavailable` ẩn danh sách.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('next-intl', () => ({ useTranslations: (ns: string) => (k: string) => `${ns}.${k}` }));

import { CitationList } from './CitationList';
import type { AiCitations } from './types';

afterEach(cleanup);

const TEXT = 'Dạ 😊 spa mở 8h–20h ạ';
const base = (o: Partial<AiCitations>): AiCitations => ({
  answer: { run_id: 'r1', generation: 1 },
  state: 'validated',
  entries: [
    { source_id: 's1', name: 'Giờ mở cửa', heading: 'Ngày thường', claim_start: 5, claim_end: 18 },
    { source_id: 's2', name: null, heading: null, claim_start: 0, claim_end: 2 },
  ],
  ...o,
});

describe('CitationList', () => {
  it('none / null → không hiện', () => {
    const { container } = render(
      <>
        <CitationList citations={null} />
        <CitationList citations={base({ state: 'none', entries: [] })} />
      </>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('validated: tên + mục, đoạn được chống đỡ theo điểm mã; nguồn không đọc được → nhãn chung', () => {
    render(<CitationList citations={base({})} text={TEXT} />);
    expect(screen.getByTestId('ai-citations').getAttribute('data-state')).toBe('validated');
    const items = screen.getAllByTestId('ai-citation').map((x) => x.textContent);
    expect(items[0]).toBe('Giờ mở cửa › Ngày thường — “spa mở 8h–20h”');
    expect(items[1]).toBe('common.citations.restricted — “Dạ”');
  });

  it('original_draft: tiêu đề nguồn của nháp gốc, không trích đoạn lên chữ hiện tại', () => {
    render(<CitationList citations={base({ state: 'original_draft' })} text="chữ đã sửa" />);
    expect(screen.getByText('common.citations.originalDraft')).toBeTruthy();
    expect(screen.getAllByTestId('ai-citation')[0]!.textContent).toBe('Giờ mở cửa › Ngày thường');
  });

  it('unavailable: chỉ thông báo, không danh sách / tên', () => {
    render(<CitationList citations={base({ state: 'unavailable' })} text={TEXT} />);
    expect(screen.getByText('common.citations.unavailable')).toBeTruthy();
    expect(screen.queryAllByTestId('ai-citation')).toHaveLength(0);
  });
});
