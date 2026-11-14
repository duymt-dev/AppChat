// TIP-027b §1.3: schema 5 action media sản phẩm — ghi catalog.manage, KHÔNG cấp cho agent (như product.create / update); đọc catalog.view
// cấp được; nguồn gắn chỉ hai dạng đóng (tệp tải cho đúng sản phẩm | artifact Trợ lý có revision), không URL / storage key; sắp xếp nhận
// danh sách id (hoán vị đủ kiểm ở server) ≤ 20; mọi ghi cần if_version; kết quả không có trường link tải. Mô tả: description_doc đóng.
import { describe, expect, it } from 'vitest';
import { getAction, productMediaAttach, productMediaList, productMediaReorder, productUpdate } from '../src';

const ID = '0193a000-0000-7000-8000-000000000001';

describe('product media actions', () => {
  it('đăng ký đủ 5 action: quyền + rủi ro + không cấp agent cho ghi', () => {
    const meta = (id: string) => {
      const d = getAction(id)!;
      return [d.permission, d.risk, d.agentGrantable, !!d.undo];
    };
    expect(meta('product.media_attach')).toEqual(['catalog.manage', 'write', false, false]);
    expect(meta('product.media_detach')).toEqual(['catalog.manage', 'delete', false, false]);
    expect(meta('product.media_reorder')).toEqual(['catalog.manage', 'write', false, false]);
    expect(meta('product.media_set_primary')).toEqual(['catalog.manage', 'write', false, false]);
    expect(meta('product.media_list')).toEqual(['catalog.view', 'read', true, false]);
    // Không mở rộng quyền viết catalog cho agent qua đường media.
    expect(getAction('product.update')!.agentGrantable).toBe(false);
  });

  it('nguồn gắn: chỉ target_upload_handle | assistant_artifact_ref (có revision); thiếu if_version → từ chối', () => {
    const ok = (source: unknown, extra: Record<string, unknown> = { if_version: 0 }) => productMediaAttach.input.safeParse({ product_id: ID, source, ...extra }).success;
    expect(ok({ kind: 'target_upload_handle', file_id: ID })).toBe(true);
    expect(ok({ kind: 'assistant_artifact_ref', artifact_id: ID, revision: 1 })).toBe(true);
    expect(ok({ kind: 'assistant_artifact_ref', artifact_id: ID })).toBe(false);
    expect(ok({ kind: 'url', url: 'https://x/a.png' })).toBe(false);
    expect(ok({ kind: 'target_upload_handle', file_id: ID, url: 'https://x' })).toBe(false);
    expect(ok({ kind: 'target_upload_handle', file_id: ID }, {})).toBe(false);
  });

  it('sắp xếp: danh sách id 1–20 theo loại; danh sách đọc không có link tải', () => {
    const ok = (ids: string[]) => productMediaReorder.input.safeParse({ product_id: ID, kind: 'image', media_ids: ids, if_version: 1 }).success;
    expect(ok([ID])).toBe(true);
    expect(ok([])).toBe(false);
    expect(ok(Array.from({ length: 21 }, () => ID))).toBe(false);
    const keys = Object.keys((productMediaList.output.shape.items.element as unknown as { shape: Record<string, unknown> }).shape);
    expect(keys).not.toContain('url');
    expect(keys.some((k) => /url|storage|signed/i.test(k))).toBe(false);
  });

  it('mô tả: description_doc đóng — nút / dấu ngoài danh sách bị từ chối, null = xoá', () => {
    const ok = (doc: unknown) => productUpdate.input.safeParse({ product_id: ID, patch: { description_doc: doc } }).success;
    expect(ok({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A', marks: ['bold'] }] }] })).toBe(true);
    expect(ok(null)).toBe(true);
    expect(ok({ type: 'doc', version: 1, content: [{ type: 'html', html: '<b>x</b>' }] })).toBe(false);
    expect(ok({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A', marks: ['link'] }] }] })).toBe(false);
  });
});
