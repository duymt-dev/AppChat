// Khối section: tiêu đề + con; đường dẫn node của con lồng đúng (intent theo "0.1").
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { part, renderUi } from './test-utils';

describe('SectionBlock', () => {
  it('tiêu đề + con', () => {
    renderUi(part({ type: 'section', title: 'Tổng quan', children: [{ type: 'text', text: 'Nội dung' }] }));
    const s = screen.getByTestId('genui-section');
    expect(s.textContent).toContain('Tổng quan');
    expect(s.textContent).toContain('Nội dung');
  });
});
