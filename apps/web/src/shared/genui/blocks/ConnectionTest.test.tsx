// Nút "Kiểm tra kết nối" của form kết nối GenUI (TIP-023c G3 mục 10): email → channel.test, connector → integration.test với giá trị đang
// nhập (kể cả ô bí mật, đi thẳng action — không qua intent / model); kết quả hiện ngay, lý do theo i18n; không quyền → ẩn nút; form
// không phải kết nối → không có nút.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import type { UiBlock } from '@appchat/shared';
import { part, renderUi } from './test-utils';

const action = vi.fn();
const get = vi.fn();
vi.mock('../../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a), get: (...a: unknown[]) => get(...a), post: vi.fn() } }));

const INTENT = { '': 'h_intent_form_000000000000' };
const SENTINEL = 'S3CRET-probe-key';
const owner = { role: 'owner', is_owner: true, permissions: [], scope: {}, team_ids: [] };
const sepay: UiBlock = {
  type: 'form',
  action_id: 'integration.connect',
  fields: [
    { name: 'provider', value: 'sepay' },
    { name: 'fields.api_key', label: 'API key', secret: true },
    { name: 'fields.account_number', label: 'Số tài khoản', value: '0123' },
  ],
};

describe('ConnectionTest', () => {
  beforeEach(() => {
    action.mockReset();
    get.mockReset().mockResolvedValue(owner);
  });

  it('connector: integration.test với giá trị đang nhập, kết quả failed → lý do i18n', async () => {
    action.mockResolvedValueOnce({ status: 200, data: { result: { status: 'failed', reason: 'rejected' }, action_log_id: 'l1' } });
    renderUi(part(sepay, {}, INTENT));
    fireEvent.change(await screen.findByTestId('genui-secret'), { target: { value: SENTINEL } });
    await act(async () => fireEvent.click(await screen.findByTestId('genui-form-test')));
    expect(action.mock.calls[0]).toEqual(['integration.test', { provider: 'sepay', fields: { api_key: SENTINEL, account_number: '0123' } }, {}]);
    expect((await screen.findByTestId('genui-form-test-result')).textContent).toContain('Thông tin đăng nhập không đúng');
    // Kiểm tra không phải gửi form: chưa có lệnh kết nối nào.
    expect(action.mock.calls.some((c) => c[0] === 'integration.connect')).toBe(false);
  });

  it('email: channel.test form nháp kèm address; ok → hợp lệ', async () => {
    action.mockResolvedValueOnce({ status: 200, data: { result: { ok: true, message: 'Kết nối hoạt động' }, action_log_id: 'l2' } });
    const mail: UiBlock = { type: 'form', action_id: 'channel.email.connect', fields: [{ name: 'address', value: 'hotro@spa.vn' }, { name: 'fields.imap_host', value: 'imap.gmail.com' }, { name: 'fields.password' }] };
    renderUi(part(mail, {}, INTENT));
    await act(async () => fireEvent.click(await screen.findByTestId('genui-form-test')));
    expect(action.mock.calls[0]?.[0]).toBe('channel.test');
    expect(action.mock.calls[0]?.[1]).toEqual({ type: 'email', fields: { imap_host: 'imap.gmail.com', address: 'hotro@spa.vn' } });
    expect((await screen.findByTestId('genui-form-test-result')).textContent).toContain('Kết nối hợp lệ');
  });

  it('không quyền integrations.manage → không có nút; form không phải kết nối → không có nút', async () => {
    get.mockResolvedValue({ ...owner, role: 'sales', is_owner: false, permissions: ['contacts.manage'] });
    renderUi(part(sepay, {}, INTENT));
    await screen.findByTestId('genui-form');
    await act(async () => undefined);
    expect(screen.queryByTestId('genui-form-test')).toBeNull();
    get.mockResolvedValue(owner);
    renderUi(part({ type: 'form', action_id: 'contact.create', fields: [{ name: 'full_name', value: 'A' }] }, {}, INTENT));
    await act(async () => undefined);
    expect(screen.queryByTestId('genui-form-test')).toBeNull();
  });
});
