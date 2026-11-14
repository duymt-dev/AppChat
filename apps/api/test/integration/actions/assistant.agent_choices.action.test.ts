// Ma trận assistant.agent_choices (TIP-023d §5.2): danh sách agent đang chạy + đã xuất bản (metadata an toàn, keyset); limit ngoài khoảng
// → 422. Đọc thuần.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('assistant.agent_choices');
}, 120_000);
afterAll(() => m?.close());

describe('assistant.agent_choices', () => {
  it('agent đã xuất bản hiện, không lộ prompt; limit sai → 422', async () => {
    const a = await m.seed('agent.create_and_publish', { name: 'Chọn Ma Trận', role: 'sales', tools: ['contact.create'], threshold: 70 });
    const r = await m.act({ limit: 10 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const row = (r.body.data.result.data as { id: string }[]).find((x) => x.id === a.agent_id);
    expect(row).toMatchObject({ id: a.agent_id, name: 'Chọn Ma Trận', role: 'sales' });
    expect(JSON.stringify(row)).not.toMatch(/system_prompt|persona/);
    expect((await m.act({ limit: 0 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
