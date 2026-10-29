import { describe, expect, it, vi } from 'vitest';
import { dispatchUiCommand, registerUiCommand } from './ui-command-bus';

describe('UiCommandBus', () => {
  it('gọi handler đã đăng ký theo form / entity', () => {
    const h = vi.fn();
    const off = registerUiCommand('prefill:quote.form', h);
    expect(dispatchUiCommand({ type: 'prefill', form: 'quote.form', values: { a: 1 } })).toBe(true);
    expect(h).toHaveBeenCalledOnce();
    off();
    expect(dispatchUiCommand({ type: 'prefill', form: 'quote.form', values: {} })).toBe(false);
  });

  it('không có handler → false (caller chuyển thành navigate)', () => {
    expect(dispatchUiCommand({ type: 'open', entity: 'order', id: '1' })).toBe(false);
  });
});
