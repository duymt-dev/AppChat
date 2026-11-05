// Khối stack: con theo thứ tự; cây sai schema (khối lạ) → khối lỗi, không render nửa vời.
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { UiBlock } from '@appchat/shared';
import { part, renderUi } from './test-utils';

describe('StackBlock', () => {
  it('dựng con theo thứ tự', () => {
    renderUi(part({ type: 'stack', children: [{ type: 'text', text: 'A' }, { type: 'badge', text: 'B' }] }));
    const s = screen.getByTestId('genui-stack');
    expect(s.children).toHaveLength(2);
    expect(s.textContent).toBe('AB');
  });

  it('khối ngoài danh mục → khối lỗi, không dựng phần nào', () => {
    renderUi(part({ type: 'stack', children: [{ type: 'text', text: 'A' }, { type: 'html', html: '<b>x</b>' } as unknown as UiBlock] }));
    expect(screen.getByTestId('genui-error')).toBeTruthy();
    expect(screen.queryByTestId('genui-stack')).toBeNull();
  });
});
