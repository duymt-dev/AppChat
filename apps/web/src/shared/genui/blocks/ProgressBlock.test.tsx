// Khối progress: value / max từ ref → phần trăm (kẹp 0–100); thiếu ref → Không có dữ liệu.
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { part, renderUi } from './test-utils';

describe('ProgressBlock', () => {
  it('value / max', () => {
    renderUi(part({ type: 'progress', label: 'Chỉ tiêu', value: { $ref: 'step:1.done' }, max: { $ref: 'step:1.goal' } }, { 'step:1': { done: 30, goal: 40 } }));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('75');
    expect(screen.getByTestId('genui-progress').textContent).toContain('30 / 40');
  });

  it('không có max → phần trăm, kẹp 100', () => {
    renderUi(part({ type: 'progress', label: 'Tỷ lệ', value: { $ref: 'step:1.p' } }, { 'step:1.p': 140 }));
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('ref mất quyền → Không có dữ liệu', () => {
    renderUi(part({ type: 'progress', label: 'Tỷ lệ', value: { $ref: 'step:1.p' } }, { 'step:1.p': { unavailable: true } }));
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByTestId('genui-nodata')).toBeTruthy();
  });
});
