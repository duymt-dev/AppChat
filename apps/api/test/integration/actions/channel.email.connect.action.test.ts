// Ma trận channel.email.connect (TIP-023b): kết nối hộp thư (risk config, hộp thư giả MAIL_TRANSPORT=fake) → tài khoản mới (địa chỉ · máy
// chủ, không credential) + cảnh báo kiểm đăng nhập; form sai → 422, địa chỉ trùng → 409 ở preview. 403 sales. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FAKE_MAIL_HOST, FAKE_MAIL_PASSWORD } from '@appchat/channels';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';

let m: Matrix;
const BOX = 'cskh@spa-matrix.vn';
const fields = { imap_host: FAKE_MAIL_HOST, imap_port: '993', password: FAKE_MAIL_PASSWORD };

beforeAll(async () => {
  m = await matrix('channel.email.connect');
  await teamPlan(m);
}, 120_000);
afterAll(() => m?.close());

describe('channel.email.connect', () => {
  it('403 sales · form sai → 422', async () => {
    expect((await m.act({ address: BOX, fields }, m.sales)).status).toBe(403);
    expect((await m.act({ address: BOX, fields: { imap_host: FAKE_MAIL_HOST } }, undefined, { 'x-action-source': 'assistant' })).status).toBe(422);
  });

  it('preview Trợ lý → xác nhận; trùng địa chỉ → 409', async () => {
    const { preview, done } = await m.confirm({ address: BOX, name: 'CSKH', fields });
    expect(preview).toMatchObject({ summary: 'CSKH', risk: 'config', changes: [{ entity: 'channel_account', after: { type: 'email', name: 'CSKH', address: BOX, imap_host: FAKE_MAIL_HOST } }], warnings: ['verify_login'] });
    expect(JSON.stringify(preview)).not.toContain(FAKE_MAIL_PASSWORD);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ address: BOX, fields }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ address: 'exists' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
