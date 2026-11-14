// Khối button_group: intent theo đường dẫn từng nút ("0", "1"); nút action không có intent bị ẩn, nút ui vẫn hiện.
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { part, renderUi } from './test-utils';

vi.mock('../../api/client', () => ({ transport: { action: vi.fn(), get: vi.fn(), post: vi.fn() } }));

describe('ButtonGroupBlock', () => {
  it('ẩn nút action thiếu intent, giữ nút có intent + nút ui', () => {
    renderUi(
      part(
        {
          type: 'button_group',
          buttons: [
            { type: 'button', label: 'Mở', on: { kind: 'ui', command: { type: 'navigate', route: '/customers' } } },
            { type: 'button', label: 'Gắn thẻ', on: { kind: 'action', action_id: 'contact.tag', input: {} } },
            { type: 'button', label: 'Xoá', on: { kind: 'action', action_id: 'contact.delete', input: {} } },
          ],
        },
        {},
        { '1': 'h_intent_1111111111111111' },
      ),
    );
    const btns = screen.getAllByTestId('genui-button');
    expect(btns.map((b) => b.textContent)).toEqual(['Mở', 'Gắn thẻ']);
    expect(btns.map((b) => b.getAttribute('data-kind'))).toEqual(['ui', 'action']);
  });
});
