// Khối row: con xếp ngang (class responsive tự xếp dọc ở mobile).
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { part, renderUi } from './test-utils';

describe('RowBlock', () => {
  it('dựng các con trong một hàng', () => {
    renderUi(part({ type: 'row', children: [{ type: 'text', text: 'Trái' }, { type: 'text', text: 'Phải' }] }));
    expect(screen.getByTestId('genui-row').children).toHaveLength(2);
  });
});
