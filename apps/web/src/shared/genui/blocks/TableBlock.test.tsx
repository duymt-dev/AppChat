// Khối table: compact 5 dòng × 3 cột + "Mở rộng" → modal full cùng cây (đủ dòng / cột, không gọi lại gì); dòng bấm → UiCommand open
// (chuột + Enter); ref thiếu → Không có dữ liệu.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { UiBlock } from '@appchat/shared';
import { part, renderUi } from './test-utils';

const rows = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, name: `Khách ${i}`, total: 1000 * (i + 1), city: 'HN', phone: '09', tag: 'VIP' }));
const table: UiBlock = {
  type: 'table',
  columns: [
    { key: 'name', label: 'Tên' },
    { key: 'total', label: 'Tổng', format: 'money' },
    { key: 'city', label: 'TP' },
    { key: 'phone', label: 'SĐT' },
  ],
  rows: { $ref: 'step:1.rows' },
  open: { entity: 'contact', id_key: 'id' },
};

describe('TableBlock', () => {
  it('compact cắt 5 × 3, "Mở rộng" mở modal full đủ 8 dòng × 4 cột', () => {
    renderUi(part(table, { 'step:1': { rows } }), 'compact');
    const t = screen.getByTestId('genui-table');
    expect(t.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(t.querySelectorAll('th')).toHaveLength(3);
    expect(t.textContent).toContain('1.000₫');
    fireEvent.click(screen.getByTestId('genui-expand'));
    const modal = screen.getByTestId('genui-modal');
    const full = within(modal).getByTestId('genui-table');
    expect(full.querySelectorAll('tbody tr')).toHaveLength(8);
    expect(full.querySelectorAll('th')).toHaveLength(4);
    expect(within(modal).queryByTestId('genui-expand')).toBeNull();
  });

  it('dòng bấm / Enter → open entity + id', () => {
    const onUi = vi.fn();
    renderUi(part(table, { 'step:1.rows': rows }), 'full', { onUi });
    const tr = screen.getByTestId('genui-table').querySelectorAll('tbody tr');
    fireEvent.click(tr[2]!);
    expect(onUi).toHaveBeenLastCalledWith({ type: 'open', entity: 'contact', id: 'c2' });
    fireEvent.keyDown(tr[3]!, { key: 'Enter' });
    expect(onUi).toHaveBeenLastCalledWith({ type: 'open', entity: 'contact', id: 'c3' });
  });

  it('ref không có → Không có dữ liệu', () => {
    renderUi(part(table, {}));
    expect(screen.getByTestId('genui-nodata')).toBeTruthy();
  });
});
