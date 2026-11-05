// Khối button: `ui` → UiCommand (không gọi API); `action` → chỉ hiện khi server phát intent cho node, gọi action kèm header intent
// (nguồn assistant → server bắt xem trước). Không có intent (không quyền / action không còn) → ẩn.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { part, renderUi } from './test-utils';

const action = vi.fn();
vi.mock('../../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a), get: vi.fn(), post: vi.fn() } }));

describe('ButtonBlock', () => {
  beforeEach(() => action.mockReset());

  it('ui → onUi, không gọi API', () => {
    const onUi = vi.fn();
    renderUi(part({ type: 'button', label: 'Lọc khách VIP', on: { kind: 'ui', command: { type: 'filter', table: 'contacts', filter: { tag: 'VIP' } } } }), 'full', { onUi });
    fireEvent.click(screen.getByTestId('genui-button'));
    expect(onUi).toHaveBeenCalledWith({ type: 'filter', table: 'contacts', filter: { tag: 'VIP' } });
    expect(action).not.toHaveBeenCalled();
  });

  it('action có intent → gọi kèm intent handle; input cố định của node', async () => {
    action.mockResolvedValue({ status: 200, data: { result: {}, action_log_id: 'l1' } });
    renderUi(part({ type: 'button', label: 'Gắn thẻ VIP', on: { kind: 'action', action_id: 'contact.tag', input: { contact_ids: ['c1'], add: ['VIP'] } } }, {}, { '': 'h_intent_0000000000000000' }));
    await act(async () => fireEvent.click(screen.getByTestId('genui-button')));
    expect(action).toHaveBeenCalledWith('contact.tag', { contact_ids: ['c1'], add: ['VIP'] }, expect.objectContaining({ genuiIntent: 'h_intent_0000000000000000' }));
  });

  it('action không có intent → ẩn nút', () => {
    renderUi(part({ type: 'button', label: 'Xoá', on: { kind: 'action', action_id: 'contact.delete', input: {} } }));
    expect(screen.queryByTestId('genui-button')).toBeNull();
  });
});
