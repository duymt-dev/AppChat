// Khối stat: số CHỈ từ ref, định dạng ở renderer (tiền ₫); compare dương → "+"; ref thiếu / mất quyền → "Không có dữ liệu".
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { part, renderUi } from './test-utils';

describe('StatBlock', () => {
  it('giá trị từ ref + format money + compare', () => {
    renderUi(part({ type: 'stat', label: 'Doanh thu', value: { $ref: 'step:2.total' }, compare: { $ref: 'step:2.delta' }, format: 'money' }, { 'step:2.total': 12500000, 'step:2.delta': 300000 }));
    const s = screen.getByTestId('genui-stat');
    expect(s.textContent).toContain('12.500.000₫');
    expect(s.textContent).toContain('+300.000₫');
  });

  it('đọc theo output cả bước (step:<n>)', () => {
    renderUi(part({ type: 'stat', label: 'Khách mới', value: { $ref: 'step:1.count' }, format: 'number' }, { 'step:1': { count: 1234 } }));
    expect(screen.getByTestId('genui-stat').textContent).toContain('1.234');
  });

  it('ref unavailable / thiếu → Không có dữ liệu, không đoán số', () => {
    renderUi(part({ type: 'stat', label: 'Doanh thu', value: { $ref: 'step:2.total' } }, { 'step:2.total': { unavailable: true } }));
    expect(screen.getByTestId('genui-nodata').textContent).toBe('Không có dữ liệu');
  });
});
