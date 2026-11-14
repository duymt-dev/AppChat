// TIP-028b §2.2: hộp xác nhận gửi / duyệt chứng từ hiện bảng kiểm pháp lý — mục đạt / chưa đạt + lý do (mẫu thiếu · dữ liệu trống), chỉ
// cảnh báo (nút xác nhận không khoá — DC-444); useAction tự xin xem trước cho action chứng từ, action khác giữ như cũ; mock trả bảng kiểm.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import actions from '../../../messages/vi/actions.json';
import common from '../../../messages/vi/common.json';
import { ChecklistPanel } from './ChecklistPanel';
import { ConfirmActionHost } from './ConfirmActionHost';
import { useConfirmStore } from './confirm-store';
import { mockTransport } from '../api/mock/mock-transport';
import { setMockRole } from '../api/mock/store';

const action = vi.fn();
vi.mock('../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a) } }));
vi.mock('antd', async (orig) => ({ ...(await orig<typeof import('antd')>()), App: { useApp: () => ({ message: { info: vi.fn(), open: vi.fn(), error: vi.fn() } }) } }));

import { useAction } from './useAction';

const intl = (ui: ReactNode) => (
  <NextIntlClientProvider locale="vi" messages={{ actions, common }}>
    {ui}
  </NextIntlClientProvider>
);
const QUOTE = [
  { code: 'seller_tax', ok: false, hint: 'empty:business.tax_code' },
  { code: 'date', ok: true },
  { code: 'validity', ok: false, hint: 'template' },
  { code: 'vat_note', ok: true },
];

afterEach(() => {
  cleanup();
  useConfirmStore.setState({ pending: null });
});

describe('ChecklistPanel', () => {
  it('mục chưa đạt có lý do: MST bên bán trống / mẫu thiếu mục; tóm tắt số mục + ghi chú chỉ cảnh báo', () => {
    render(intl(<ChecklistPanel items={QUOTE} />));
    const box = screen.getByTestId('confirm-checklist');
    const row = (code: string) => box.querySelector(`[data-check="${code}"]`)!;
    expect(box.textContent).toContain('2 mục cần xem lại');
    expect(row('seller_tax').getAttribute('data-ok')).toBe('false');
    expect(row('seller_tax').textContent).toContain('Thông tin bên bán + MST');
    expect(row('seller_tax').textContent).toContain('Mẫu có mục này nhưng MST DN đang trống');
    expect(row('validity').textContent).toContain('Mẫu chứng từ chưa có mục này');
    expect(row('date').getAttribute('data-ok')).toBe('true');
    expect(box.textContent).toContain('Chỉ là cảnh báo');
  });

  it('đủ mục → "Đủ các mục", không ghi chú', () => {
    render(intl(<ChecklistPanel items={[{ code: 'not_vat', ok: true }]} />));
    expect(screen.getByTestId('confirm-checklist').textContent).toContain('Đủ các mục');
    expect(screen.queryByText(/Chỉ là cảnh báo/)).toBeNull();
  });
});

describe('ConfirmActionHost', () => {
  it('preview có bảng kiểm → hiện panel; nút xác nhận vẫn bấm được dù có mục chưa đạt', async () => {
    render(intl(<ConfirmActionHost />));
    let settled: boolean | undefined;
    act(() => void useConfirmStore.getState().ask('quote.send', { summary: 'BG-1 · Chị Lan', risk: 'send', checklist: QUOTE }).then((v) => (settled = v)));
    expect(await screen.findByTestId('confirm-checklist')).toBeTruthy();
    const ok = screen.getByRole('button', { name: 'Xác nhận' }) as HTMLButtonElement;
    expect(ok.disabled).toBe(false);
    await act(async () => ok.click());
    expect(settled).toBe(true);
  });

  it('preview không có bảng kiểm → không panel', async () => {
    render(intl(<ConfirmActionHost />));
    act(() => void useConfirmStore.getState().ask('contact.delete', { summary: 'Chị Lan', risk: 'delete' }));
    expect(await screen.findByText('Chị Lan')).toBeTruthy();
    expect(screen.queryByTestId('confirm-checklist')).toBeNull();
  });
});

describe('useAction — xin xem trước action chứng từ', () => {
  beforeEach(() => action.mockReset());
  const wrapper = ({ children }: { children: ReactNode }) => intl(<QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>);

  it('quote.send gửi `preview: true`; action khác không', async () => {
    action.mockResolvedValue({ status: 200, data: { result: {}, action_log_id: 'l1' } });
    const a = renderHook(() => useAction('quote.send'), { wrapper });
    await act(async () => void (await a.result.current.run({ quote_id: 'q1', channel: 'email' })));
    expect(action.mock.calls[0]![2]).toMatchObject({ preview: true });
    const b = renderHook(() => useAction('contact.update'), { wrapper });
    await act(async () => void (await b.result.current.run({ contact_id: 'c', patch: {} })));
    expect(action.mock.calls[1]![2]).not.toHaveProperty('preview');
  });
});

describe('mock — preview chứng từ có bảng kiểm', () => {
  beforeEach(() => setMockRole('owner'));

  it('xin xem trước quote.send → 202 + bảng kiểm theo mẫu mặc định mock; không xin → chạy thẳng', async () => {
    const draft = (await mockTransport.get<{ data: { id: string; status: string }[] }>('/quotes', { limit: 200 })).data.find((q) => q.status === 'draft' || q.status === 'approved');
    expect(draft).toBeTruthy();
    const r = await mockTransport.action('quote.send', { quote_id: draft!.id, channel: 'email' }, { preview: true });
    expect(r.status).toBe(202);
    const p = (r.data as { preview: { checklist?: { code: string }[] } }).preview;
    expect(p.checklist?.map((c) => c.code)).toEqual(['seller_tax', 'date', 'validity', 'vat_note']);
  });
});
