// TIP-032d §3.1–3.2, §3.5 (unit): panel đọc qua `<loại>.files_list` của ĐÚNG bản ghi; chứng từ đã sinh chỉ có "Mở" (không gỡ); bản gốc mất →
// nói thật, không mở được; chọn tệp → tải staging kèm đích → gắn với revision đang thấy → chỉ khi biên nhận mới làm mới danh sách; lỗi gắn
// giữ tên tệp + lý do (không báo thành công); 409 revision → "đã đổi" + đọc lại; không quyền ghi → không nút tải lên; gỡ hỏi xác nhận.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { ApiRequestError } from '@appchat/shared';

vi.mock('next-intl', () => {
  const t = (k: string, v?: Record<string, unknown>) => `${k}${v?.name ? `:${v.name}` : ''}${v?.reason ? `:${v.reason}` : ''}`;
  t.has = () => true;
  return { useTranslations: () => t };
});
vi.mock('../i18n/useFmt', () => ({ useFmt: () => ({ date: () => 'd' }) }));
const action = vi.fn();
const upload = vi.fn();
const blob = vi.fn();
vi.mock('../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a), upload: (...a: unknown[]) => upload(...a), blob: (...a: unknown[]) => blob(...a) } }));
const attachRun = vi.fn();
const detachRun = vi.fn();
vi.mock('../actions/useAction', () => ({ useAction: (id: string) => ({ run: id.endsWith('file_attach') ? attachRun : detachRun, isPending: false, accepted: null }) }));

import { RecordFilesPanel } from './RecordFilesPanel';
import type { RecordFile } from './types';

afterEach(() => {
  cleanup();
  for (const f of [action, upload, blob, attachRun, detachRun]) f.mockReset();
});

const row = (o: Partial<RecordFile> = {}): RecordFile => ({
  attachment_id: 'a1',
  file_id: 'f1',
  name: 'bien-ban.pdf',
  mime: 'application/pdf',
  bytes: 2048,
  created_at: '2026-06-24T09:00:00+07:00',
  created_by: 'u1',
  created_by_name: 'Trâm',
  kind: 'user_attachment',
  version: 1,
  available: true,
  can_detach: true,
  ...o,
});
const list = (files: RecordFile[], over: Record<string, unknown> = {}) => action.mockResolvedValue({ status: 200, data: { result: { files, revision: 3, can_attach: true, next_cursor: null, ...over } } });
const mount = (type: 'order' | 'invoice' = 'order') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <App>
        <RecordFilesPanel record={{ type, id: 'r-1' }} />
      </App>
    </QueryClientProvider>,
  );
const pick = (name: string) => fireEvent.change(screen.getByTestId('rf-order-input'), { target: { files: [new File(['x'], name, { type: 'application/pdf' })] } });

describe('RecordFilesPanel', () => {
  it('đọc qua action của đúng bản ghi; tệp người dùng có Mở + Gỡ, chứng từ đã sinh chỉ Mở', async () => {
    list([row({ kind: 'generated_invoice', attachment_id: null, version: null, can_detach: false, file_id: 'g1', name: 'DN.pdf' }), row()]);
    mount('invoice');
    expect(await screen.findByText('bien-ban.pdf')).toBeTruthy();
    expect(action).toHaveBeenCalledWith('invoice.files_list', { invoice_id: 'r-1', limit: 20 });
    const rows = screen.getAllByTestId('rf-invoice-row');
    expect(rows.map((r) => r.getAttribute('data-kind'))).toEqual(['generated_invoice', 'user_attachment']);
    expect(screen.getAllByTestId('rf-invoice-detach')).toHaveLength(1);
  });

  it('bản gốc mất → nói thật, nút Mở tắt', async () => {
    list([row({ available: false })]);
    mount();
    expect(await screen.findByText(/missing/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'openName:bien-ban.pdf' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('chọn tệp → tải kèm đích → gắn với revision đang thấy → đọc lại; chọn chưa phải đã gắn', async () => {
    list([]);
    upload.mockResolvedValue({ file_id: 'up-1', name: 'phu-luc.pdf', size: 1 });
    attachRun.mockResolvedValue({ result: { attachment_id: 'a9', file_id: 'up-1', version: 1, revision: 4, reused: false } });
    mount();
    await screen.findByTestId('rf-order-empty');
    pick('phu-luc.pdf');
    await waitFor(() => expect(attachRun).toHaveBeenCalled());
    expect(upload.mock.calls[0]!.slice(1)).toEqual(['record_attachment', undefined, { parent_type: 'order', parent_id: 'r-1' }]);
    expect(attachRun.mock.calls[0]![0]).toEqual({ order_id: 'r-1', source: { kind: 'target_upload_handle', file_id: 'up-1' }, if_revision: 3 });
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
  });

  it('gắn bị từ chối (kiểm cấu trúc) → giữ tên + lý do, không báo thành công', async () => {
    list([]);
    upload.mockResolvedValue({ file_id: 'up-2', name: 'm.docx', size: 1 });
    attachRun.mockImplementation(async (_i: unknown, o: { onError: (e: ApiRequestError) => boolean }) => {
      o.onError(new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'x', fields: { file_id: 'macro' } }));
      return null;
    });
    mount();
    await screen.findByTestId('rf-order-empty');
    pick('m.docx');
    expect((await screen.findByTestId('rf-order-error')).textContent).toBe('failed:m.docx:reason.macro');
  });

  it('tải lên bị chặn (loại tệp) → lỗi rõ, không gọi gắn', async () => {
    list([]);
    upload.mockRejectedValue(new ApiRequestError(415, { code: 'VALIDATION_FAILED', message: 'x', fields: { file: 'type_not_allowed' } }));
    mount();
    await screen.findByTestId('rf-order-empty');
    pick('a.html');
    expect((await screen.findByTestId('rf-order-error')).textContent).toBe('failed:a.html:reason.type_not_allowed');
    expect(attachRun).not.toHaveBeenCalled();
  });

  it('revision lệch (409) → "đã đổi" + đọc lại', async () => {
    list([]);
    upload.mockResolvedValue({ file_id: 'up-3', name: 'b.pdf', size: 1 });
    attachRun.mockImplementation(async (_i: unknown, o: { onError: (e: ApiRequestError) => boolean }) => {
      o.onError(new ApiRequestError(409, { code: 'STALE_VERSION', message: 'x', fields: { if_revision: 'changed' } }));
      return null;
    });
    mount();
    await screen.findByTestId('rf-order-empty');
    pick('b.pdf');
    expect(await screen.findByTestId('rf-order-stale')).toBeTruthy();
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
  });

  it('không quyền ghi → không có nút tải lên / gỡ', async () => {
    list([row({ can_detach: false })], { can_attach: false });
    mount();
    await screen.findByText('bien-ban.pdf');
    expect(screen.queryByTestId('rf-order-upload')).toBeNull();
    expect(screen.queryByTestId('rf-order-detach')).toBeNull();
  });

  it('gỡ hỏi xác nhận rồi mới gọi file_detach với version đang thấy', async () => {
    list([row({ version: 2 })]);
    detachRun.mockResolvedValue({ result: { attachment_id: 'a1', revision: 4 } });
    mount();
    fireEvent.click(await screen.findByTestId('rf-order-detach'));
    expect(detachRun).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'detach' }));
    await waitFor(() => expect(detachRun).toHaveBeenCalledWith({ order_id: 'r-1', attachment_id: 'a1', if_version: 2 }));
  });
});
