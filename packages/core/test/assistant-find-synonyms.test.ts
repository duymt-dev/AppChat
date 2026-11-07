// TIP-023b (ai:live 2026-11-03 — lỗi hệ thống, không phải model chọn sai): người dùng gọi sản phẩm là "dịch vụ" / "gói", câu tự nhiên có từ
// ngoài chỉ mục ("sửa giá dịch vụ") → find_actions vẫn ra action đúng; câu không liên quan vẫn rỗng; quyền / chế độ giữ nguyên.
import { describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import { findActions } from '../src/ai/assistant/catalog';

const owner = authzForRole('owner', 'u1');
const cs = authzForRole('cs', 'u3');
const find = (q: string, mode: 'chat' | 'cowork' = 'cowork', who = owner) => findActions(who, mode, q, undefined, 8, () => true).map((a) => a.id);

describe('find_actions — từ đồng nghĩa + xếp hạng dự phòng', () => {
  it('"dịch vụ" / "gói" / "liệu trình" là product', () => {
    expect(find('dịch vụ', 'chat')).toContain('product.search');
    expect(find('thêm dịch vụ')).toContain('product.create');
    expect(find('sửa giá dịch vụ')).toContain('product.update');
    expect(find('cập nhật giá gói')).toContain('product.update');
  });

  it('câu nhiều từ không khớp đủ → xếp theo số từ khớp (gắn thẻ khách, gia hạn báo giá, tồn kho)', () => {
    expect(find('gắn thẻ khách hàng')).toContain('contact.tag');
    expect(find('gia hạn báo giá')).toContain('quote.extend_validity');
    expect(find('kiểm tra tồn kho sản phẩm', 'chat')).toContain('stock.get');
    expect(find('ngừng bán sản phẩm')).toContain('product.archive');
  });

  it('không liên quan → rỗng; Chat vẫn chỉ read; quyền vẫn lọc', () => {
    expect(find('thời tiết hôm nay')).toEqual([]);
    expect(find('sửa giá dịch vụ', 'chat').every((id) => !id.endsWith('.update'))).toBe(true);
    expect(find('sửa giá dịch vụ', 'cowork', cs)).not.toContain('product.update');
  });
});
