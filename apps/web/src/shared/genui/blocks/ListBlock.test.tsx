// Khối list: mục chữ của model; mục dữ liệu từ ref (title_key / subtitle_key) + open; compact 5 mục + "Mở rộng".
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { part, renderUi } from './test-utils';

describe('ListBlock', () => {
  it('mục chữ do model viết', () => {
    renderUi(part({ type: 'list', items: ['Gọi lại khách A', 'Gửi báo giá B'] }));
    expect(screen.getByTestId('genui-list').querySelectorAll('li')).toHaveLength(2);
  });

  it('mục từ ref + open; compact cắt 5 mục', () => {
    const onUi = vi.fn();
    const data = Array.from({ length: 7 }, (_, i) => ({ id: `t${i}`, title: `Ticket ${i}`, status: 'open' }));
    renderUi(part({ type: 'list', items: { $ref: 'step:3.items' }, title_key: 'title', subtitle_key: 'status', open: { entity: 'ticket', id_key: 'id' } }, { 'step:3.items': data }), 'compact', { onUi });
    const li = screen.getByTestId('genui-list').querySelectorAll('li');
    expect(li).toHaveLength(5);
    expect(li[0]!.textContent).toBe('Ticket 0open');
    fireEvent.click(li[1]!);
    expect(onUi).toHaveBeenCalledWith({ type: 'open', entity: 'ticket', id: 't1' });
    expect(screen.getByTestId('genui-expand').textContent).toContain('+2');
  });
});
