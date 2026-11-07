// TIP-039 pha 3 (AC08): hộp "Liên hệ" gói Doanh nghiệp — kiểm tra ô tại chỗ (không gọi action khi thiếu đồng ý / sai email), gửi đúng
// input `billing.contact_sales`, thành công mới báo "đã nhận" và đóng; RATE_LIMITED hiện lỗi tại chỗ, không báo thành công; người không có
// billing.manage chỉ thấy nhắc liên hệ Chủ sở hữu (không có form gửi).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ApiRequestError } from '@appchat/shared';

const run = vi.fn();
const success = vi.fn();
let can = true;
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run, isPending: false }) }));
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => can }));
vi.mock('@/shared/shell/useShellData', () => ({
  useMe: () => ({ data: { user: { name: 'Chủ Shop', email: 'owner@shop.vn' } } }),
}));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { success } }) } }));

import { useBillingUi } from '../billing-store';
import { ContactSalesModal } from './ContactSalesModal';

const type = (id: string, v: string) => fireEvent.change(screen.getByTestId(id), { target: { value: v } });
const save = () => act(async () => void fireEvent.click(screen.getByTestId('contact-sales-modal-save')));

beforeEach(() => {
  run.mockReset();
  success.mockReset();
  can = true;
  useBillingUi.setState({ contactOpen: true });
});

afterEach(cleanup);

describe('ContactSalesModal', () => {
  it('đóng thì không render', () => {
    useBillingUi.setState({ contactOpen: false });
    render(<ContactSalesModal />);
    expect(screen.queryByTestId('contact-sales-modal')).toBeNull();
  });

  it('thiếu đồng ý / sai số điện thoại → lỗi tại chỗ, không gọi action', async () => {
    render(<ContactSalesModal />);
    type('contact-phone', 'abc');
    type('contact-message', 'Cần 20 người dùng');
    await save();
    expect(screen.getByTestId('contact-error').textContent).toBe('errPhone');
    type('contact-phone', '0901 234 567');
    await save();
    expect(screen.getByTestId('contact-error').textContent).toBe('errConsent');
    expect(run).not.toHaveBeenCalled();
  });

  it('đủ ô → gửi billing.contact_sales (điền sẵn tên / email từ tài khoản), báo đã nhận rồi đóng', async () => {
    run.mockResolvedValue({ inquiry_id: 'x', status: 'received' });
    render(<ContactSalesModal />);
    type('contact-phone', '0901 234 567');
    type('contact-message', 'Cần 20 người dùng');
    fireEvent.click(screen.getByTestId('contact-consent'));
    await save();
    expect(run.mock.calls[0]![0]).toEqual({
      name: 'Chủ Shop',
      email: 'owner@shop.vn',
      phone: '0901 234 567',
      message: 'Cần 20 người dùng',
      consent: true,
    });
    expect(success).toHaveBeenCalledWith('received');
    expect(useBillingUi.getState().contactOpen).toBe(false);
  });

  it('RATE_LIMITED → lỗi giới hạn tại chỗ, không báo thành công, hộp vẫn mở', async () => {
    run.mockImplementation(async (_i, o: { onError: (e: ApiRequestError) => boolean }) => {
      o.onError(new ApiRequestError(429, { code: 'RATE_LIMITED', message: 'too_many' }));
      return null;
    });
    render(<ContactSalesModal />);
    type('contact-phone', '0901234567');
    type('contact-message', 'Cần báo giá');
    fireEvent.click(screen.getByTestId('contact-consent'));
    await save();
    expect(screen.getByTestId('contact-error').textContent).toBe('errLimit');
    expect(success).not.toHaveBeenCalled();
    expect(useBillingUi.getState().contactOpen).toBe(true);
  });

  it('không có billing.manage → chỉ nhắc liên hệ Chủ sở hữu, không có ô nhập', () => {
    can = false;
    render(<ContactSalesModal />);
    expect(screen.getByTestId('contact-sales-ask-owner')).toBeTruthy();
    expect(screen.queryByTestId('contact-phone')).toBeNull();
  });
});
