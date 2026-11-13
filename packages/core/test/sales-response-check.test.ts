// TIP-022c AC7 (unit): bước kiểm khẳng định thương mại — schema đóng, mơ hồ / sai khuôn / loại lạ → chặn (đóng an toàn); kế hoạch bán
// hàng sai khuôn → chặn tự gửi (kiểm ở packages/ai/test/sales-plan.test.ts).
import { describe, expect, it } from 'vitest';
import { parseCheck } from '../src/ai/sales-behavior/response-check';

describe('parseCheck', () => {
  it('rỗng → clean; có loại → claims (gộp trùng)', () => {
    expect(parseCheck('{"claims":[],"ambiguous":false}')).toEqual({ kind: 'clean' });
    expect(parseCheck('```json\n{"claims":["stock","price","stock"],"ambiguous":false}\n```')).toEqual({ kind: 'claims', claims: ['stock', 'price'] });
  });

  it('mơ hồ / loại lạ / thiếu trường / chữ thường → unreadable (chặn)', () => {
    for (const raw of ['{"claims":[],"ambiguous":true}', '{"claims":["discount"],"ambiguous":false}', '{"claims":[]}', 'không có khẳng định nào', '{"claims":"stock","ambiguous":false}']) {
      expect(parseCheck(raw)).toEqual({ kind: 'unreadable' });
    }
  });
});
