// Ngữ cảnh màn (TIP-023c G2.6): feature đăng ký → lượt gửi đúng route / entity / id / selection (cắt giới hạn); unmount không xoá màn mới.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, renderHook } from '@testing-library/react';
import { SELECTION_MAX, currentScreen, toTurnContext, useRegisterScreenContext, useScreenContextStore, type ScreenRegistration } from './screen-context';
import { messagesOf } from './useScreenAssistant';

afterEach(() => {
  cleanup();
  useScreenContextStore.getState().set(null);
});

describe('screen-context', () => {
  it('đăng ký / cập nhật / huỷ theo màn; màn mới đăng ký trước khi màn cũ unmount thì giữ màn mới', () => {
    const { rerender, unmount } = renderHook((r: ScreenRegistration) => useRegisterScreenContext(r), {
      initialProps: { module: 'customers', route: '/customers', entity: 'contact', id: null, selection: [] } as ScreenRegistration,
    });
    expect(currentScreen()).toEqual({ module: 'customers', route: '/customers', entity: 'contact' });
    rerender({ module: 'customers', route: '/customers', entity: 'contact', id: 'ct_lan', selection: ['kh_1002', 'kh_1003'] });
    expect(currentScreen()).toMatchObject({ id: 'ct_lan', selection: ['kh_1002', 'kh_1003'] });
    useScreenContextStore.getState().set({ module: 'quotes', route: '/quotes' });
    unmount();
    expect(currentScreen()?.module).toBe('quotes');
  });

  it('toTurnContext: chỉ id, ≤ 50 dòng chọn, id ≤ 80 ký tự; không màn → route dự phòng', () => {
    const many = Array.from({ length: 70 }, (_, i) => `kh_${i}`);
    const ctx = toTurnContext({ module: 'customers', route: '/customers', entity: 'contact', id: 'x'.repeat(200), selection: many }, 'drawer', '/');
    expect(ctx.selection).toHaveLength(SELECTION_MAX);
    expect(ctx.id).toHaveLength(80);
    expect(ctx).toMatchObject({ route: '/customers', entity: 'contact', surface: 'drawer' });
    expect(toTurnContext(null, 'drawer', '/inbox')).toEqual({ route: '/inbox', surface: 'drawer' });
    expect(toTurnContext({ module: 'm', route: '/m', entity: 'contact' }, undefined, '/')).toEqual({ route: '/m' });
    // Chỉ chọn dòng (không mở bản ghi) → vẫn gửi entity để server kiểm dòng chọn (E2E http AC4 bắt).
    expect(toTurnContext({ module: 'm', route: '/m', entity: 'contact', id: null, selection: ['a', 'b'] }, 'drawer', '/')).toEqual({ route: '/m', entity: 'contact', selection: ['a', 'b'], surface: 'drawer' });
  });

  it('messagesOf: delta gộp, thẻ chờ xác nhận, cây ui riêng, lệnh UI tách ra (không thành tin)', () => {
    const { msgs, commands } = messagesOf([
      { type: 'delta', text: 'Chào ' },
      { type: 'delta', text: 'chị' },
      { type: 'ui', tree: { version: 1, root: { type: 'text', text: 'x' } }, run_id: 'r', refs: {}, intents: {} },
      { type: 'ui_command', command: { type: 'highlight', target: 'contact:ct_lan' } },
    ] as never);
    expect(msgs.map((m) => [m.text, !!m.ui])).toEqual([['Chào chị', false], ['', true]]);
    expect(commands).toEqual([{ type: 'highlight', target: 'contact:ct_lan' }]);
  });
});

describe('phiên drawer theo workspace', () => {
  it('đổi workspace → bỏ mọi phiên drawer (không lẫn giữa workspace); cùng workspace giữ nguyên', async () => {
    const { useScreenThreads } = await import('./useScreenAssistant');
    const st = useScreenThreads.getState();
    st.bindWorkspace('ws_a');
    st.patch('customers', { sessionId: 'as_1', msgs: [{ id: 'm', role: 'user', text: 'x' }] });
    useScreenThreads.getState().bindWorkspace('ws_a');
    expect(useScreenThreads.getState().threads.customers?.sessionId).toBe('as_1');
    useScreenThreads.getState().bindWorkspace('ws_b');
    expect(useScreenThreads.getState().threads).toEqual({});
  });
});
