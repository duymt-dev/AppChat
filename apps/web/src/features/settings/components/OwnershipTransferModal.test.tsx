// TIP-045b annex A3 — hộp chuyển quyền Chủ sở hữu: chỉ liệt kê thành viên active (không Owner / lời mời), nêu hậu quả theo người nhận;
// bước 1 gửi mã đúng người nhận; bước 2 phải đủ 6 số + gõ lại đúng tên mới gọi action; lỗi OTP_INVALID giữ hộp mở và hiện đúng lý do.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ApiRequestError } from '@appchat/shared';

const runs = vi.hoisted(() => ({ request: vi.fn(), transfer: vi.fn() }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: Record<string, unknown>) => (v ? `${k}:${JSON.stringify(v)}` : k) }));
vi.mock('@/shared/actions/useAction', () => ({
  useAction: (id: string) => ({ run: id === 'workspace.request_transfer_otp' ? runs.request : runs.transfer, isPending: false }),
}));

import { OwnershipTransferModal } from './OwnershipTransferModal';
import { useSettingsUi } from '../settings-store';
import type { Member } from '../types';

const M = (id: string, name: string, o: Partial<Member> = {}): Member => ({ id, name, email: `${id}@spa.vn`, role: 'sales', dept: '', color: '', last: 'online', status: 'active', invite: false, ...o });
const MEMBERS = [M('own', 'Chủ', { role: 'owner' }), M('lan', 'Chị Lan'), M('inv', 'Mời', { invite: true, status: 'pending' })];

const pick = (id: string) => fireEvent.change(screen.getByTestId('st-transfer-to'), { target: { value: id } });
const save = () => act(async () => fireEvent.click(screen.getByTestId('st-transfer-modal-save')));

describe('OwnershipTransferModal', () => {
  afterEach(cleanup);
  beforeEach(() => {
    runs.request.mockReset().mockResolvedValue({ result: { sent_to: 'ow•••@spa.vn', expires_at: '2026-11-05T08:10:00Z' } });
    runs.transfer.mockReset();
    useSettingsUi.getState().set({ transferOpen: true });
  });

  it('chỉ thành viên active khác Owner; hậu quả nêu tên người nhận; gửi mã đúng người', async () => {
    render(<OwnershipTransferModal members={MEMBERS} />);
    const opts = [...screen.getByTestId('st-transfer-to').querySelectorAll('option')].map((o) => o.getAttribute('value'));
    expect(opts).toEqual(['', 'lan']);
    await save();
    expect(runs.request).not.toHaveBeenCalled();
    expect(screen.getByTestId('st-transfer-error').textContent).toBe('err.pick');
    pick('lan');
    expect(screen.getByTestId('st-transfer-consequence').textContent).toBe('consequence:{"name":"Chị Lan"}');
    await save();
    expect(runs.request).toHaveBeenCalledWith({ to_user_id: 'lan' }, { silent: true });
    expect(screen.getByText('sent:{"to":"ow•••@spa.vn"}')).toBeTruthy();
    expect((screen.getByTestId('st-transfer-to') as HTMLSelectElement).disabled).toBe(true);
  });

  it('phải đủ 6 số + gõ lại đúng tên mới chuyển; thành công đóng hộp', async () => {
    runs.transfer.mockResolvedValue({ result: { owner_user_id: 'lan', previous_owner_role: 'manager' } });
    render(<OwnershipTransferModal members={MEMBERS} />);
    pick('lan');
    await save();
    fireEvent.change(screen.getByTestId('st-transfer-otp'), { target: { value: '12a3' } });
    await save();
    expect(screen.getByTestId('st-transfer-error').textContent).toBe('err.format');
    fireEvent.change(screen.getByTestId('st-transfer-otp'), { target: { value: '123456' } });
    fireEvent.change(screen.getByTestId('st-transfer-name'), { target: { value: 'Lan' } });
    await save();
    expect(screen.getByTestId('st-transfer-error').textContent).toBe('err.confirm');
    expect(runs.transfer).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId('st-transfer-name'), { target: { value: 'Chị Lan' } });
    await save();
    expect(runs.transfer).toHaveBeenCalledWith({ to_user_id: 'lan', otp: '123456' }, expect.objectContaining({ onError: expect.any(Function) }));
    expect(useSettingsUi.getState().transferOpen).toBe(false);
  });

  it('OTP_INVALID giữ hộp mở với lý do (stale / expired); lỗi khác để toast chung', async () => {
    runs.transfer.mockImplementation(async (_i: unknown, o: { onError: (e: ApiRequestError) => boolean }) => {
      expect(o.onError(new ApiRequestError(422, { code: 'OTP_INVALID', message: 'x', fields: { otp: 'stale' } }))).toBe(true);
      expect(o.onError(new ApiRequestError(403, { code: 'FORBIDDEN', message: 'x' }))).toBe(false);
      return null;
    });
    render(<OwnershipTransferModal members={MEMBERS} />);
    pick('lan');
    await save();
    fireEvent.change(screen.getByTestId('st-transfer-otp'), { target: { value: '123456' } });
    fireEvent.change(screen.getByTestId('st-transfer-name'), { target: { value: 'Chị Lan' } });
    await save();
    expect(screen.getByTestId('st-transfer-error').textContent).toBe('err.stale');
    expect(useSettingsUi.getState().transferOpen).toBe(true);
  });
});
