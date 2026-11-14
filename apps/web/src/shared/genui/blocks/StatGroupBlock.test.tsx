// Khối stat_group: compact tối đa 3 cột / hàng, full theo số stat (≤ 6).
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { UiBlock } from '@appchat/shared';
import { part, renderUi } from './test-utils';

const group: UiBlock = { type: 'stat_group', stats: [1, 2, 3, 4].map((i) => ({ type: 'stat' as const, label: `S${i}`, value: { $ref: `step:1.v${i}` } })) };
const refs = { 'step:1': { v1: 1, v2: 2, v3: 3, v4: 4 } };

describe('StatGroupBlock', () => {
  it('compact → 3 cột; full → 4 cột', () => {
    const { unmount } = renderUi(part(group, refs), 'compact');
    expect(screen.getByTestId('genui-stat-group').style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(screen.getAllByTestId('genui-stat')).toHaveLength(4);
    unmount();
    renderUi(part(group, refs), 'full');
    expect(screen.getByTestId('genui-stat-group').style.gridTemplateColumns).toBe('repeat(4, minmax(0, 1fr))');
  });
});
