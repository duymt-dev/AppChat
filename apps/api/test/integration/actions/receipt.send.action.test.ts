// Ma trận receipt.send (TIP-032b P2): risk send; 403 cs (không payment.record); khoản thu lạ → 404; khoản chưa xác nhận / không có phiếu
// thu → 409; kênh ngoài danh sách → 422. Gửi thật (PDF phiếu thu đóng băng + tin) kiểm ở commerce-delivery test. Undo: không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('receipt.send');
}, 120_000);
afterAll(() => m?.close());

describe('receipt.send', () => {
  it('403 cs · khoản lạ 404 · kênh lạ 422', async () => {
    expect((await m.act({ payment_id: uuidv7() }, m.cs)).status).toBe(403);
    expect((await m.act({ payment_id: uuidv7() })).status).toBe(404);
    expect((await m.act({ payment_id: 'x' })).status).toBe(404);
    expect((await m.act({ payment_id: uuidv7(), channel: 'sms' })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
