// TIP-020b — chính sách nguồn KB không cần DB: visibility nguồn mới (chỉ định > mặc định thư mục > public) — parser KHÔNG chèn default
// (bỏ trống phải tới được server); nguồn catalog không sửa / xoá được (CONFLICT catalog_managed + chỉ dẫn sửa sản phẩm); tên tải về an
// toàn; action thư mục mới không agentGrantable, quyền kb.manage, CAS if_version.
import { describe, expect, it } from 'vitest';
import { getAction, kbAddSource } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { assertEditable, resolveVisibility } from '../src/ai/kb/source-policy';
import { safeName } from '../src/ai/kb/source-download';

describe('visibility nguồn mới', () => {
  it('parser giữ bỏ trống (không default public) — explicit giữ nguyên', () => {
    expect(kbAddSource.input.parse({ name: 'Quy trình.pdf' }).visibility).toBeUndefined();
    expect(kbAddSource.input.parse({ name: 'x', visibility: 'public' }).visibility).toBe('public');
    expect(kbAddSource.input.parse({ name: 'x', visibility: 'internal' }).visibility).toBe('internal');
    expect(kbAddSource.input.safeParse({ name: 'x', visibility: 'secret' }).success).toBe(false);
  });

  it('chỉ định > thư mục > public', () => {
    expect(resolveVisibility(undefined, 'internal')).toBe('internal');
    expect(resolveVisibility(undefined, null)).toBe('public');
    expect(resolveVisibility('public', 'internal')).toBe('public');
    expect(resolveVisibility('internal', 'public')).toBe('internal');
  });
});

describe('nguồn catalog', () => {
  it('sửa / xoá / hoàn tác → CONFLICT catalog_managed, kèm sản phẩm gốc', () => {
    let e: unknown;
    try {
      assertEditable({ origin: 'catalog', productId: 'p1' });
    } catch (x) {
      e = x;
    }
    expect(e).toBeInstanceOf(AppError);
    expect((e as AppError).code).toBe('CONFLICT');
    expect((e as AppError).fields).toEqual({ source_id: 'catalog_managed', reason: 'edit_product', product_id: 'p1' });
  });

  it('nguồn khác không bị chặn', () => {
    for (const origin of ['upload', 'url', 'text', 'conversation', 'drive']) expect(() => assertEditable({ origin })).not.toThrow();
  });
});

describe('tên tải về', () => {
  it('giữ dấu tiếng Việt, bỏ phân cách đường dẫn / ký tự điều khiển / ngoặc kép', () => {
    expect(safeName('Bảng giá Hè 2026.pdf')).toBe('Bảng giá Hè 2026.pdf');
    expect(safeName('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(safeName('a"b\u0000c\\d.txt')).toBe('a_b_c_d.txt');
    expect(safeName('   ')).toBe('source');
  });
});

describe('ActionDef thư mục', () => {
  it('update / delete: kb.manage, không agentGrantable, undo 24h, if_version tuỳ chọn', () => {
    for (const id of ['kb.folder.update', 'kb.folder.delete']) {
      const d = getAction(id)!;
      expect(d).toMatchObject({ permission: 'kb.manage', agentGrantable: false, undo: { windowSec: 86_400 } });
      expect(d.input.safeParse({ folder_id: 'f1', if_version: 2 }).success).toBe(true);
      expect(d.input.safeParse({ folder_id: 'f1', if_version: 0 }).success).toBe(false);
    }
    expect(getAction('kb.folder.delete')!.risk).toBe('delete');
    const u = getAction('kb.folder.update')!.input;
    expect(u.safeParse({ folder_id: 'f1', name: ' ' }).success).toBe(false);
    expect(u.safeParse({ folder_id: 'f1', name: 'x'.repeat(61) }).success).toBe(false);
    expect(u.safeParse({ folder_id: 'f1', visibility: 'secret' }).success).toBe(false);
    expect(u.safeParse({ folder_id: 'f1', parent_id: null }).success).toBe(true);
  });
});
