// Ma trận channel.test (TIP-023b R2): tài khoản tạm dừng → không ok kèm lý do · form nháp loại không hỗ trợ → 422 · 403 (sales không có
// channels.manage) · nguồn assistant. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { account } from '../helpers/channel-fixtures';

let m: Matrix;
let acc: string;

beforeAll(async () => {
  m = await matrix('channel.test');
  acc = await account(m, 'zalo_personal', 'Zalo Cửa hàng', { paused: true });
}, 120_000);
afterAll(() => m?.close());

describe('channel.test', () => {
  it('tài khoản tạm dừng → không ok · id lạ → 404 · loại không hỗ trợ → 422', async () => {
    const r = await m.act({ channel_account_id: acc });
    expect(r.body.data.result.ok).toBe(false);
    expect((await m.act({ channel_account_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({ type: 'zalo_personal', fields: {} })).body.error.fields).toEqual({ type: 'unsupported' });
  });

  it('403: sales không có channels.manage', async () => {
    expect((await m.act({ channel_account_id: acc }, m.sales)).status).toBe(403);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ channel_account_id: acc }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.ok).toBe(false);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
