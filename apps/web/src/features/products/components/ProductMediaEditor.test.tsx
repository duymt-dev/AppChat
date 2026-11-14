// TIP-027b §3.1 / §3.4 (unit): tab Tệp đọc khối `media` của đúng sản phẩm; ảnh xem trước qua bytes đã kiểm quyền → object URL, thu hồi
// khi rời sản phẩm; chọn tệp → tải staging đích product → gắn với version đang thấy; 409 version → "đã đổi" + "Thử lại" gắn ĐÚNG id tệp
// đã tải (không tải lại); không quyền sửa → không nút tải / gỡ / ảnh chính; gỡ hỏi xác nhận; dời ảnh gửi hoán vị đủ.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from 'antd';
import { ApiRequestError, type ProductMediaDto, type ProductMediaItemDto } from '@appchat/shared';

vi.mock('next-intl', () => {
  const t = (k: string, v?: Record<string, unknown>) => `${k}${v?.name ? `:${v.name}` : ''}${v?.reason ? `:${v.reason}` : ''}`;
  t.has = () => true;
  return { useTranslations: () => t };
});
vi.mock('@/shared/i18n/useFmt', () => ({ useFmt: () => ({ date: () => 'd' }) }));
const upload = vi.fn();
const blob = vi.fn();
vi.mock('@/shared/api/client', () => ({ transport: { upload: (...a: unknown[]) => upload(...a), blob: (...a: unknown[]) => blob(...a) } }));
const runs: Record<string, ReturnType<typeof vi.fn>> = { attach: vi.fn(), detach: vi.fn(), reorder: vi.fn(), set_primary: vi.fn() };
vi.mock('@/shared/actions/useAction', () => ({ useAction: (id: string) => ({ run: runs[id.replace('product.media_', '')], isPending: false, accepted: null }) }));

import { ProductMediaEditor } from './ProductMediaEditor';
import type { Product } from '../types';

const created: string[] = [];
const revoked: string[] = [];
URL.createObjectURL = vi.fn(() => {
  const u = `blob:${created.length}`;
  created.push(u);
  return u;
}) as never;
URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u)) as never;

afterEach(() => {
  cleanup();
  for (const f of [upload, blob, ...Object.values(runs)]) f.mockReset();
  created.length = 0;
  revoked.length = 0;
});

const item = (o: Partial<ProductMediaItemDto>): ProductMediaItemDto => ({ media_id: 'm1', file_id: 'f1', kind: 'image', name: 'a.png', mime: 'image/png', bytes: 2048, position: 0, is_primary: false, version: 1, created_at: '2026-11-12T09:00:00Z', available: true, ...o });
const media = (items: ProductMediaItemDto[], o: Partial<ProductMediaDto> = {}): ProductMediaDto => ({ items, version: 4, can_edit: true, limits: { image: 10, document: 20 }, ...o });
const prod = (id: string, m: ProductMediaDto) => ({ id, media: m }) as Product;
const qc = new QueryClient();
const ui = (p: Product) => (
  <QueryClientProvider client={qc}>
    <App>
      <ProductMediaEditor key={p.id} p={p} />
    </App>
  </QueryClientProvider>
);
const pick = (name: string) => fireEvent.change(screen.getByTestId('pd-media-input'), { target: { files: [new File(['x'], name, { type: 'image/png' })] } });
const fail = (status: number, code: string, fields?: Record<string, string>) => async (_i: unknown, o: { onError: (e: ApiRequestError) => boolean }) => {
  o.onError(new ApiRequestError(status, { code: code as never, message: 'x', ...(fields ? { fields } : {}) }));
  return null;
};

describe('ProductMediaEditor', () => {
  it('ảnh xem trước qua bytes đã kiểm quyền; rời sản phẩm thu hồi object URL', async () => {
    blob.mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
    const two = media([item({ is_primary: true }), item({ media_id: 'm2', file_id: 'f2', name: 'b.png', position: 1 }), item({ media_id: 'd1', file_id: 'fd', kind: 'document', name: 'spec.pdf' })]);
    const r = render(ui(prod('p1', two)));
    await waitFor(() => expect(created).toHaveLength(2));
    expect(blob).toHaveBeenCalledWith('/files/f1');
    expect(blob).not.toHaveBeenCalledWith('/files/fd');
    expect(screen.getAllByTestId('pd-media-image')[0]!.getAttribute('data-primary')).toBe('true');
    expect(screen.getAllByTestId('pd-media-doc')).toHaveLength(1);
    r.rerender(ui(prod('p2', media([]))));
    await waitFor(() => expect([...revoked].sort()).toEqual([...created].sort()));
    expect(screen.getByTestId('pd-media-empty')).toBeTruthy();
  });

  it('chọn tệp → tải đích product → gắn theo version; 409 → Thử lại gắn đúng tệp đã tải, không tải lại', async () => {
    upload.mockResolvedValue({ file_id: 'up-1', name: 'c.png', size: 1 });
    runs.attach!.mockImplementationOnce(fail(409, 'STALE_VERSION'));
    render(ui(prod('p1', media([]))));
    pick('c.png');
    expect(await screen.findByTestId('pd-media-stale')).toBeTruthy();
    expect(upload).toHaveBeenCalledWith(expect.any(File), 'record_attachment', undefined, { parent_type: 'product', parent_id: 'p1' });
    expect(runs.attach).toHaveBeenCalledWith({ product_id: 'p1', source: { kind: 'target_upload_handle', file_id: 'up-1' }, if_version: 4 }, expect.anything());
    runs.attach!.mockResolvedValueOnce({ result: { media_id: 'm9' } });
    fireEvent.click(screen.getByTestId('pd-media-retry'));
    await waitFor(() => expect(runs.attach).toHaveBeenCalledTimes(2));
    expect(upload).toHaveBeenCalledTimes(1);
    expect(runs.attach!.mock.calls[1]![0]).toMatchObject({ source: { file_id: 'up-1' } });
    await waitFor(() => expect(screen.queryByTestId('pd-media-stale')).toBeNull());
  });

  it('lỗi kiểm tệp giữ tên + lý do, không báo thành công', async () => {
    upload.mockResolvedValue({ file_id: 'up-2', name: 'anim.png', size: 1 });
    runs.attach!.mockImplementationOnce(fail(422, 'VALIDATION_FAILED', { file_id: 'animated' }));
    render(ui(prod('p1', media([]))));
    pick('anim.png');
    expect((await screen.findByTestId('pd-media-failed')).textContent).toContain('anim.png:reason.animated');
  });

  it('không quyền sửa → không tải lên / gỡ / ảnh chính', () => {
    blob.mockResolvedValue(new Blob(['x']));
    render(ui(prod('p1', media([item({ is_primary: true })], { can_edit: false }))));
    expect(screen.queryByTestId('pd-media-upload')).toBeNull();
    expect(screen.queryByTestId('pd-media-detach')).toBeNull();
    expect(screen.queryByTestId('pd-media-primary')).toBeNull();
  });

  it('dời ảnh gửi hoán vị đủ; đặt ảnh chính theo version; gỡ hỏi xác nhận', async () => {
    blob.mockResolvedValue(new Blob(['x']));
    runs.reorder!.mockResolvedValue({ result: {} });
    runs.set_primary!.mockResolvedValue({ result: {} });
    runs.detach!.mockResolvedValue({ result: {} });
    render(ui(prod('p1', media([item({ is_primary: true }), item({ media_id: 'm2', file_id: 'f2', name: 'b.png', position: 1 })]))));
    fireEvent.click(screen.getByRole('button', { name: 'moveDown:a.png' }));
    expect(runs.reorder).toHaveBeenCalledWith({ product_id: 'p1', kind: 'image', media_ids: ['m2', 'm1'], if_version: 4 }, expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'makePrimary:b.png' }));
    expect(runs.set_primary).toHaveBeenCalledWith({ product_id: 'p1', media_id: 'm2', if_version: 4 }, expect.anything());
    fireEvent.click(screen.getAllByTestId('pd-media-detach')[0]!);
    expect(runs.detach).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'detach' }));
    await waitFor(() => expect(runs.detach).toHaveBeenCalledWith({ product_id: 'p1', media_id: 'm1', if_version: 4 }));
  });
});
