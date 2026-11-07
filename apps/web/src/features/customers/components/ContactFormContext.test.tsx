// TIP-025b §D.3 — form sửa khách theo edit-context: chỉ gửi trường ĐÃ ĐỔI + if_version; trường ẩn không hiện, không gửi (không thành
// chuỗi rỗng); 409 STALE_VERSION → báo, giữ nội dung đang nhập; không đổi gì → đóng, không gọi ghi.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const runs = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('next-intl', () => ({ useTranslations: () => Object.assign((k: string) => k, { rich: (k: string) => k }) }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: (id: string) => ({ run: id === 'contact.update' ? runs.update : vi.fn(), isPending: false }) }));
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => true }));
vi.mock('@/shared/custom-fields', () => ({
  useCustomDraft: () => ({ fields: [], raw: {}, errors: {}, set: vi.fn(), collect: () => ({ ok: true }), absorb: () => false }),
  CustomFieldInputs: () => null,
}));
vi.mock('../api', () => ({ membersQuery: () => ({ queryKey: ['members'], queryFn: async () => [] }) }));

import { ContactFormModal } from './ContactFormModal';

const target = { id: 'ct_lan', version: 4, full_name: 'Nguyễn Thị Lan', title: 'Chủ shop', city: 'HN', owner_user_id: 'u1', hidden: ['phone', 'email'] };
const wrap = (onClose = vi.fn()) => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ContactFormModal mode="edit" contact={target} onClose={onClose} />
    </QueryClientProvider>,
  );
  return onClose;
};

describe('ContactFormModal (edit-context)', () => {
  afterEach(() => {
    cleanup();
    runs.update.mockReset();
  });

  it('chỉ gửi trường đã đổi + if_version; trường ẩn không hiện / không gửi', async () => {
    runs.update.mockResolvedValue({ result: { contact_id: 'ct_lan', version: 5 } });
    const onClose = wrap();
    expect(screen.queryByLabelText('edit.phone')).toBeNull();
    expect(screen.queryByLabelText('edit.email')).toBeNull();
    fireEvent.change(screen.getByLabelText('edit.city'), { target: { value: 'Đà Nẵng' } });
    fireEvent.click(screen.getByTestId('crm-save'));
    await waitFor(() => expect(runs.update).toHaveBeenCalledTimes(1));
    expect(runs.update.mock.calls[0]![0]).toEqual({ contact_id: 'ct_lan', patch: { city: 'Đà Nẵng' }, if_version: 4 });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('không đổi gì → đóng, không gọi ghi; 409 STALE_VERSION → báo, giữ nội dung', async () => {
    const onClose = wrap();
    fireEvent.click(screen.getByTestId('crm-save'));
    expect(runs.update).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
    runs.update.mockImplementation(async (_i: unknown, o: { onError: (e: unknown) => boolean }) => (o.onError({ error: { code: 'STALE_VERSION' } }), null));
    const close2 = wrap();
    fireEvent.change(screen.getByLabelText('edit.role'), { target: { value: 'Giám đốc' } });
    fireEvent.click(screen.getByTestId('crm-save'));
    await waitFor(() => expect(screen.getByTestId('crm-edit-stale')).toBeTruthy());
    expect((screen.getByLabelText('edit.role') as HTMLInputElement).value).toBe('Giám đốc');
    expect(close2).not.toHaveBeenCalled();
  });
});
