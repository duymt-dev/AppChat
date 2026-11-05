// Ma trận webchat.update_widget (TIP-023b): lần đầu → widget mới + cảnh báo thêm tài khoản kênh; sau đó → trước / sau chỉ trường đổi; agent
// lạ → 404 ở preview. 403 sales (không có channels.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { teamPlan } from '../helpers/channel-fixtures';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('webchat.update_widget');
  await teamPlan(m);
}, 120_000);
afterAll(() => m?.close());

describe('webchat.update_widget', () => {
  it('403 sales · agent lạ → 404', async () => {
    expect((await m.act({ name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ agent_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ agent_id: 'not_found' });
  });

  it('lần đầu → widget mới; cập nhật → trước / sau', async () => {
    const first = await m.confirm({ name: 'Trợ lý Hương Sen' });
    expect(first.preview).toEqual({ summary: 'Trợ lý Hương Sen', risk: 'config', changes: [{ entity: 'webchat_widget', after: { name: 'Trợ lý Hương Sen', enabled: true } }], warnings: ['new_channel_account'] });
    expect(first.done.status, JSON.stringify(first.done.body)).toBe(200);
    const w = await (await m.db()).webchatWidget.findFirstOrThrow();
    const { preview, done } = await m.confirm({ color: '#2563eb', handoff: 80, enabled: false });
    expect(preview).toEqual({
      summary: 'Trợ lý Hương Sen',
      risk: 'config',
      changes: [{ entity: 'webchat_widget', id: w.id, before: { enabled: true, color: '#2DC56A', handoff: 70 }, after: { enabled: false, color: '#2563EB', handoff: 80 } }],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
