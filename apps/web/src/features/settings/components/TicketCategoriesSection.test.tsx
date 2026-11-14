// TIP-034b §3.2 (AC2, AC5): mục Danh mục ticket trên mock — sửa / đổi chỗ (bàn phím) / xoá, nhãn đầu là mặc định, lỗi theo dòng từ
// validator dùng chung (trùng không phân biệt hoa thường), lưu một lần qua xem trước (if_version), xung đột version GIỮ nháp + tải lại,
// prefill của Trợ lý chỉ điền nháp (không ghi), Nhập mở engine nhập dùng chung.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (k: string, v?: Record<string, unknown>) => `${ns}.${k}${v ? JSON.stringify(v) : ''}`,
  useLocale: () => 'vi',
}));
vi.mock('antd', async (orig) => ({ ...(await orig<typeof import('antd')>()), App: { useApp: () => ({ message: { success: vi.fn(), info: vi.fn(), open: vi.fn(), error: vi.fn() } }) } }));
const openTransfer = vi.fn();
vi.mock('@/features/data-transfer', () => ({ openTransfer: (...a: unknown[]) => openTransfer(...a) }));

import { DEFAULT_CATEGORY_LABELS } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { mockDb } from '@/shared/api/mock/store';
import { useConfirmStore } from '@/shared/actions/confirm-store';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { TicketCategoriesSection } from './TicketCategoriesSection';

window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener: () => undefined, removeListener: () => undefined, addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false })) as never;

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
const inputs = () => screen.getAllByTestId('st-cat-input') as HTMLInputElement[];
const values = () => inputs().map((i) => i.value);

/** Lưu → hộp xác nhận (preview) → đồng ý; trả preview đã thấy. */
async function saveAndConfirm() {
  fireEvent.click(screen.getByTestId('st-cat-save'));
  await waitFor(() => expect(useConfirmStore.getState().pending).not.toBeNull());
  const p = useConfirmStore.getState().pending!;
  act(() => useConfirmStore.getState().settle(true));
  return p;
}

beforeEach(() => {
  mockDb().role = 'owner';
  mockDb().tickets.categoryConfig = null;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TicketCategoriesSection', () => {
  it('bản ảo version 0 = 8 nhãn mặc định; nhãn đầu gắn "Mặc định"; chưa sửa thì không lưu được', async () => {
    wrap(<TicketCategoriesSection />);
    await waitFor(() => expect(values()).toEqual([...DEFAULT_CATEGORY_LABELS]));
    expect(screen.getByTestId('st-ticket-categories').dataset.version).toBe('0');
    expect(screen.getAllByText('settings.ticketCategories.default')).toHaveLength(1);
    expect((screen.getByTestId('st-cat-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('sửa + Alt+↑ đổi chỗ + xoá → lỗi trùng theo dòng chặn lưu → sửa lại (đổi tên = xoá + thêm) → xem trước có cảnh báo ticket cũ → lưu version 1', async () => {
    wrap(<TicketCategoriesSection />);
    await waitFor(() => expect(inputs()).toHaveLength(8));
    fireEvent.change(inputs()[1]!, { target: { value: '  REFUND ' } });
    await waitFor(() => expect(screen.getByTestId('st-cat-error').textContent).toBe('settings.ticketCategories.error.duplicate'));
    expect((screen.getByTestId('st-cat-save') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(inputs()[1]!, { target: { value: 'Hoàn tiền' } });
    fireEvent.keyDown(inputs()[1]!, { key: 'ArrowUp', altKey: true });
    fireEvent.click(screen.getAllByTestId('st-cat-remove')[7]!);
    expect(values().slice(0, 2)).toEqual(['Hoàn tiền', 'Refund']);
    expect(values()).toHaveLength(7);
    const p = await saveAndConfirm();
    expect(p.actionId).toBe('ticket_categories.replace');
    expect(p.preview.warnings).toEqual(['existing_tickets_unchanged']);
    expect(p.preview.changes?.[0]?.after).toMatchObject({ removed: ['Delivery', 'Complaint'], added: ['Hoàn tiền'] });
    await waitFor(() => expect(screen.getByTestId('st-ticket-categories').dataset.version).toBe('1'));
    expect(mockDb().tickets.categoryConfig?.labels.slice(0, 2)).toEqual(['Hoàn tiền', 'Refund']);
  });

  it('danh sách rỗng là lỗi kiểm (không tự trả về mặc định)', async () => {
    wrap(<TicketCategoriesSection />);
    await waitFor(() => expect(inputs()).toHaveLength(8));
    for (let i = 0; i < 8; i += 1) fireEvent.click(screen.getAllByTestId('st-cat-remove')[0]!);
    expect(screen.queryAllByTestId('st-cat-input')).toHaveLength(0);
    expect(screen.getByTestId('st-cat-list-error').textContent).toBe('settings.ticketCategories.error.empty');
    expect((screen.getByTestId('st-cat-save') as HTMLButtonElement).disabled).toBe(true);
  });

  it('người khác lưu trước → 409 STALE_VERSION: giữ nháp, hiện xung đột, lưu lại lên version mới', async () => {
    wrap(<TicketCategoriesSection />);
    await waitFor(() => expect(inputs()).toHaveLength(8));
    fireEvent.change(inputs()[0]!, { target: { value: 'Nháp của tôi' } });
    await transport.action('ticket_categories.replace', { labels: ['Người khác'], if_version: 0 });
    fireEvent.click(screen.getByTestId('st-cat-save'));
    await waitFor(() => expect(screen.getByTestId('st-cat-conflict')).toBeTruthy());
    expect(values()[0]).toBe('Nháp của tôi');
    await waitFor(() => expect(screen.getByTestId('st-ticket-categories').dataset.version).toBe('1'));
    await saveAndConfirm();
    await waitFor(() => expect(screen.getByTestId('st-ticket-categories').dataset.version).toBe('2'));
    expect(mockDb().tickets.categoryConfig?.labels[0]).toBe('Nháp của tôi');
    expect(screen.queryByTestId('st-cat-conflict')).toBeNull();
  });

  it('Trợ lý prefill chỉ điền nháp (không ghi); bỏ nháp hỏi xác nhận; Nhập mở engine nhập dùng chung', async () => {
    wrap(<TicketCategoriesSection />);
    await waitFor(() => expect(inputs()).toHaveLength(8));
    expect(dispatchUiCommand({ type: 'prefill', form: 'ticket_categories', values: { labels: ['A', 'B', 3] } })).toBe(true);
    await waitFor(() => expect(values()).toEqual(['A', 'B']));
    expect(mockDb().tickets.categoryConfig).toBeNull();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByTestId('st-cat-discard'));
    expect(confirm).toHaveBeenCalledWith('settings.ticketCategories.leave');
    await waitFor(() => expect(values()).toEqual([...DEFAULT_CATEGORY_LABELS]));
    fireEvent.click(screen.getByTestId('st-cat-import'));
    expect(openTransfer).toHaveBeenCalledWith({ entity: 'ticket_category_suggestions' });
  });

  it('chưa mở mục → prefill không có bộ nhận (không báo đã điền giả)', () => {
    expect(dispatchUiCommand({ type: 'prefill', form: 'ticket_categories', values: { labels: ['A'] } })).toBe(false);
  });
});
