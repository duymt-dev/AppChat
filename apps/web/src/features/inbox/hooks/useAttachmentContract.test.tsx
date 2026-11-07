// "Tạo hợp đồng" từ tệp khách gửi (TIP-030b spec 19): gọi contract.create_from_attachment { message_id, attachment_idx }; module Hợp đồng
// có handler → UiCommand mở drawer; không có (đang ở Hộp thư) → chuyển /contracts?open=<id>. Không quyền contract.draft → can=false.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { registerUiCommand } from '@/shared/assistant/ui-command-bus';
import { CONTRACT_MIME, useAttachmentContract } from './useAttachmentContract';

const run = vi.fn();
const push = vi.fn();
let allowed = true;
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run, isPending: false, accepted: null }) }));
vi.mock('@/shared/authz/useCan', () => ({ useCan: () => allowed }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

afterEach(() => {
  cleanup();
  run.mockReset();
  push.mockReset();
  allowed = true;
});

describe('useAttachmentContract', () => {
  it('chỉ PDF / DOCX', () => {
    expect(CONTRACT_MIME.test('application/pdf')).toBe(true);
    expect(CONTRACT_MIME.test('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    expect(CONTRACT_MIME.test('image/jpeg')).toBe(false);
  });

  it('tạo → không có handler hợp đồng → chuyển /contracts?open=', async () => {
    run.mockResolvedValue({ result: { contract_id: 'ctr_9', code: 'HĐ-9' } });
    const { result } = renderHook(() => useAttachmentContract());
    await act(async () => void (await result.current.run('m1', 0)));
    expect(run).toHaveBeenCalledWith({ message_id: 'm1', attachment_idx: 0 });
    expect(push).toHaveBeenCalledWith('/contracts?open=ctr_9');
  });

  it('module Hợp đồng đang gắn → UiCommand open, không điều hướng', async () => {
    const open = vi.fn();
    const off = registerUiCommand('open:contract', open);
    run.mockResolvedValue({ result: { contract_id: 'ctr_7', code: 'HĐ-7' } });
    const { result } = renderHook(() => useAttachmentContract());
    await act(async () => void (await result.current.run('m2', 1)));
    expect(open).toHaveBeenCalledWith({ type: 'open', entity: 'contract', id: 'ctr_7', view: 'drawer' });
    expect(push).not.toHaveBeenCalled();
    off();
  });

  it('huỷ xác nhận / lỗi → không mở gì; không quyền → can=false', async () => {
    run.mockResolvedValue(null);
    allowed = false;
    const { result } = renderHook(() => useAttachmentContract());
    expect(result.current.can).toBe(false);
    await act(async () => void (await result.current.run('m3', 0)));
    expect(push).not.toHaveBeenCalled();
  });
});
