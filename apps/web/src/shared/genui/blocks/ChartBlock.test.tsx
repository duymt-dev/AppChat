// Khối chart: dữ liệu từ ref, ≤ 24 điểm, chỉ điểm có y là số; thư viện biểu đồ lazy (thay bằng bản giả trong test — jsdom không có canvas).
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { part, renderUi } from './test-utils';

vi.mock('./ChartView', () => ({ default: (p: { kind: string; data: unknown[] }) => <div data-testid="chart-view" data-kind={p.kind} data-n={p.data.length} /> }));

describe('ChartBlock', () => {
  it('cắt 24 điểm, bỏ y không phải số, tải lazy', async () => {
    const data = [...Array.from({ length: 30 }, (_, i) => ({ d: `N${i}`, v: i })), { d: 'x', v: 'abc' }];
    renderUi(part({ type: 'chart', kind: 'column', title: 'Hội thoại / ngày', data: { $ref: 'step:2.series' }, x: 'd', y: 'v' }, { 'step:2.series': data }), 'compact');
    expect(screen.getByTestId('genui-chart').getAttribute('data-points')).toBe('24');
    const v = await screen.findByTestId('chart-view');
    expect(v.getAttribute('data-kind')).toBe('column');
    expect(v.getAttribute('data-n')).toBe('24');
  });

  it('không có dữ liệu → Không có dữ liệu, không tải biểu đồ', () => {
    renderUi(part({ type: 'chart', kind: 'line', data: { $ref: 'step:2.series' }, x: 'd', y: 'v' }, {}));
    expect(screen.getByTestId('genui-nodata')).toBeTruthy();
    expect(screen.queryByTestId('chart-view')).toBeNull();
  });
});
