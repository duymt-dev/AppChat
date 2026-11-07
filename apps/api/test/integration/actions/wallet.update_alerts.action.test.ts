// Ma trận wallet.update_alerts (TIP-039 pha 2, D24): bật / tắt nhắc Credit 80 / 95% (billing.manage, risk config, db platform). Preview
// Trợ lý → xác nhận; trước / sau vào action_log; Sales (không billing.manage) 403; không agentGrantable. Undo: ActionDef không khai.
// Luồng thật (tắt nhắc vẫn chặn AI, hội thoại sang người khi hết): billing-alerts.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('wallet.update_alerts');
}, 120_000);
afterAll(() => m?.close());

describe('wallet.update_alerts', () => {
  it('preview Trợ lý → xác nhận; persist + action_log trước / sau', async () => {
    const { preview, done } = await m.confirm({ low_alert: false });
    expect(preview).toEqual({
      summary: 'low_alert · off',
      risk: 'config',
      changes: [
        { entity: 'credit_wallet', id: m.h.ws, before: { low_alert: true }, after: { low_alert: false } },
      ],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(
      (await m.h.platform.creditWallet.findUniqueOrThrow({ where: { workspaceId: m.h.ws } })).lowAlert,
    ).toBe(false);
    const log = await (
      await m.db()
    ).actionLog.findUniqueOrThrow({ where: { id: done.body.data.action_log_id } });
    expect([log.before, log.after]).toEqual([{ low_alert: true }, { low_alert: false }]);
    // Cùng giá trị lần hai → vẫn 200, không đổi.
    expect((await m.act({ low_alert: false })).status).toBe(200);
  });

  it('Sales / CSKH (không billing.manage) → 403', async () => {
    expect((await m.act({ low_alert: true }, m.sales)).status).toBe(403);
    expect((await m.act({ low_alert: true }, m.cs)).status).toBe(403);
    expect(
      (await m.h.platform.creditWallet.findUniqueOrThrow({ where: { workspaceId: m.h.ws } })).lowAlert,
    ).toBe(false);
  });

  it('không agentGrantable; ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
