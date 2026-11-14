// Khối form (standard §5, TIP-023c hợp đồng 3): ô thường điền sẵn đã validate theo schema action (sai → trống + cảnh báo); ô bí mật dạng
// password, KHÔNG điền sẵn kể cả khi cây có giá trị; gửi = intent → 202 preview → xác nhận gửi `secret_vault` + input ĐÃ BỎ bí mật; sau
// khi gửi ô bí mật bị xoá. Không intent → ẩn form; compact ≤ 4 ô.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import type { UiBlock } from '@appchat/shared';
import { useConfirmStore } from '../../actions/confirm-store';
import { part, renderUi } from './test-utils';

const action = vi.fn();
vi.mock('../../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a), get: vi.fn(), post: vi.fn() } }));

const form: UiBlock = {
  type: 'form',
  action_id: 'channel.email.connect',
  title: 'Kết nối email',
  fields: [
    { name: 'address', label: 'Email', value: 'hotro@spa.vn' },
    { name: 'fields.imap_host', label: 'IMAP', value: 'imap.gmail.com' },
    { name: 'fields.password', label: 'Mật khẩu ứng dụng', value: 'LEAKED-BY-MODEL' },
  ],
};
const INTENT = { '': 'h_intent_form_000000000000' };
const SENTINEL = 'S3CRET-sentinel-pw';

describe('FormBlock', () => {
  beforeEach(() => {
    action.mockReset();
    useConfirmStore.setState({ pending: null });
  });

  it('ô bí mật dạng password, không điền giá trị model; ô thường điền sẵn', () => {
    renderUi(part(form, {}, INTENT));
    const secret = screen.getByTestId('genui-secret') as HTMLInputElement;
    expect(secret.type).toBe('password');
    expect(secret.value).toBe('');
    expect(document.body.innerHTML).not.toContain('LEAKED-BY-MODEL');
    expect((screen.getByDisplayValue('hotro@spa.vn') as HTMLInputElement).value).toBe('hotro@spa.vn');
  });

  it('preview → xác nhận gửi vault, không gửi lại mật khẩu; ô bí mật xoá sau gửi', async () => {
    action
      .mockResolvedValueOnce({ status: 202, data: { status: 'preview_required', preview: { summary: 'x', risk: 'config' }, confirm_token: 'ct1', expires_at: '', secret_vault: 'sv_1' } })
      .mockResolvedValueOnce({ status: 200, data: { result: { channel_account_id: 'acc' }, action_log_id: 'l1' } });
    renderUi(part(form, {}, INTENT));
    fireEvent.change(screen.getByTestId('genui-secret'), { target: { value: SENTINEL } });
    await act(async () => fireEvent.click(screen.getByTestId('genui-form-submit')));
    expect(action.mock.calls[0]).toEqual(['channel.email.connect', { address: 'hotro@spa.vn', fields: { imap_host: 'imap.gmail.com', password: SENTINEL } }, expect.objectContaining({ genuiIntent: INTENT[''] })]);
    await act(async () => useConfirmStore.getState().settle(true));
    const [, input2, opts2] = action.mock.calls[1]!;
    expect(input2).toEqual({ address: 'hotro@spa.vn', fields: { imap_host: 'imap.gmail.com' } });
    expect(JSON.stringify(input2)).not.toContain(SENTINEL);
    expect(opts2).toMatchObject({ confirmToken: 'ct1', secretVault: 'sv_1', genuiIntent: INTENT[''] });
    expect((screen.getByTestId('genui-secret') as HTMLInputElement).value).toBe('');
  });

  it('điền sẵn sai khuôn → bỏ trống + cảnh báo', () => {
    renderUi(part({ ...form, fields: [{ name: 'address', label: 'Email', value: 'không-phải-email' }, form.fields[2]!] } as UiBlock, {}, INTENT));
    expect(screen.queryByDisplayValue('không-phải-email')).toBeNull();
    expect(screen.getByText('Giá trị gợi ý không hợp lệ, vui lòng nhập lại.')).toBeTruthy();
  });

  it('không có intent → ẩn form; compact ≤ 4 ô + Mở rộng', () => {
    const { unmount } = renderUi(part(form));
    expect(screen.queryByTestId('genui-form')).toBeNull();
    unmount();
    const many: UiBlock = { type: 'form', action_id: 'channel.email.connect', fields: ['address', 'name', 'fields.imap_host', 'fields.imap_port', 'fields.user', 'fields.password'].map((name) => ({ name })) };
    renderUi(part(many, {}, INTENT), 'compact');
    expect(screen.getByTestId('genui-form').querySelectorAll('label')).toHaveLength(4);
    expect(screen.getByTestId('genui-expand')).toBeTruthy();
  });
});
