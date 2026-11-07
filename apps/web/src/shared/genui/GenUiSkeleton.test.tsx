// Khung xương cây GenUI (TIP-023c 6a): chỉ hình khối — không nút, không ô nhập, không chữ của model; vùng `inert` + aria-busy.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { wrap } from './blocks/test-utils';
import { GenUiSkeleton } from './GenUiSkeleton';

describe('GenUiSkeleton', () => {
  it('khung theo loại khối, không có phần tử tương tác', () => {
    render(wrap(<GenUiSkeleton root={{ type: 'stack', children: [{ type: 'stat' }, { type: 'row', children: [{ type: 'button' }, { type: 'form' }] }, { type: 'chart' }] }} />));
    const el = screen.getByTestId('genui-skeleton');
    expect(el.getAttribute('aria-busy')).toBe('true');
    expect(el.hasAttribute('inert')).toBe(true);
    expect(el.querySelectorAll('button, input, textarea, select, a[href], form').length).toBe(0);
    expect(el.textContent).toBe('');
  });
});
